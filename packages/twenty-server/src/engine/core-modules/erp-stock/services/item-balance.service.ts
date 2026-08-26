import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatQuantityRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  applyDeltaToMeasures,
  applyIssueToMeasures,
  microsToCurrency,
  QTY_EPSILON,
} from 'src/engine/core-modules/erp-stock/utils/item-balance-math.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

const ITEM_BALANCE_OBJECT_NAME = 'itemBalance';
const STOCK_LEDGER_ENTRY_OBJECT_NAME = 'stockLedgerEntry';
const ITEM_OBJECT_NAME = 'item';
const WAREHOUSE_OBJECT_NAME = 'warehouse';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

// Balance rows are inserted by this service, outside PostingService's
// register stamping — the createdBy actor composite is NOT NULL.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };

export type ItemBalanceKey = {
  itemId: string;
  warehouseId: string;
};

export type ItemBalanceState = {
  id: string | null;
  actualQty: number;
  avgCostMicros: number;
  currencyCode: string;
};

type StockLedgerRow = Record<string, unknown> & { id: string };

// Единая утилита работы с itemBalance: get-or-create под блокировкой,
// приход/расход по скользящей средней, откат при отмене документа.
@Injectable()
export class ItemBalanceService {
  // Deadlock prevention for documents touching several pairs (multi-line,
  // transfer's from/to, cancel's per-pair rollback): acquire every distinct
  // pair's lock upfront in one fixed lexicographic order, BEFORE the normal
  // per-line processing (which still runs in document order and re-acquires
  // the same locks). Two transactions that would otherwise lock overlapping
  // pairs in opposite row order — e.g. different document types — now both
  // take them low-to-high, so no circular wait can form. Postgres advisory
  // xact locks are session-reentrant: the later re-acquire by the same
  // transaction is a cheap no-op, not a second lock.
  async lockPairsInOrder(
    context: PostingContext,
    keys: ItemBalanceKey[],
  ): Promise<void> {
    const uniquePairs = new Map<string, ItemBalanceKey>();

    for (const key of keys) {
      uniquePairs.set(`${key.itemId}:${key.warehouseId}`, key);
    }

    const sortedPairs = [...uniquePairs.values()].sort((a, b) => {
      if (a.itemId !== b.itemId) {
        return a.itemId < b.itemId ? -1 : 1;
      }

      if (a.warehouseId === b.warehouseId) {
        return 0;
      }

      return a.warehouseId < b.warehouseId ? -1 : 1;
    });

    for (const key of sortedPairs) {
      await context.transactionScope.executeRawQuery(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`erp-stock:item-balance:${key.itemId}:${key.warehouseId}`],
      );
    }
  }

  // itemBalance has NO unique constraint on item×warehouse — dedup is this
  // service's responsibility: an advisory xact lock closes the get-or-create
  // race (FOR UPDATE alone locks nothing when the row doesn't exist yet).
  async getBalanceForUpdate(
    context: PostingContext,
    { itemId, warehouseId }: ItemBalanceKey,
  ): Promise<ItemBalanceState> {
    await context.transactionScope.executeRawQuery(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`erp-stock:item-balance:${itemId}:${warehouseId}`],
    );

    const rows = await context.transactionScope.executeRawQuery(
      `SELECT "id", "actualQty", "avgCostAmountMicros", "avgCostCurrencyCode"
       FROM ${this.itemBalanceTableReference(context.workspaceId)}
       WHERE "itemId" = $1 AND "warehouseId" = $2 AND "deletedAt" IS NULL
       ORDER BY "createdAt" ASC
       FOR UPDATE`,
      [itemId, warehouseId],
    );

    // Oldest row is canonical if duplicates ever slipped in.
    const row = rows[0];

    if (!isDefined(row)) {
      return {
        id: null,
        actualQty: 0,
        avgCostMicros: 0,
        currencyCode: RUB_CURRENCY_CODE,
      };
    }

    return {
      id: String(row.id),
      actualQty: Number(row.actualQty ?? 0),
      // node-postgres returns bigint columns as strings
      avgCostMicros: Number(row.avgCostAmountMicros ?? 0),
      currencyCode: isNonEmptyString(row.avgCostCurrencyCode)
        ? row.avgCostCurrencyCode
        : RUB_CURRENCY_CODE,
    };
  }

  // valueKopecks is the TOTAL value of the receipt (qty×price already rounded
  // by the caller) so a transfer can re-receive the exact issued cost.
  async applyReceipt(
    context: PostingContext,
    key: ItemBalanceKey,
    quantity: number,
    valueKopecks: number,
    currencyCode: string,
  ): Promise<{ qtyAfter: number; avgCostMicros: number }> {
    const state = await this.getBalanceForUpdate(context, key);
    const measures = applyDeltaToMeasures(
      { actualQty: state.actualQty, avgCostMicros: state.avgCostMicros },
      quantity,
      valueKopecks,
    );

    await this.saveBalance(context, key, state.id, measures, currencyCode);

    return {
      qtyAfter: measures.actualQty,
      avgCostMicros: measures.avgCostMicros,
    };
  }

  async applyIssue(
    context: PostingContext,
    key: ItemBalanceKey,
    quantity: number,
  ): Promise<{
    qtyAfter: number;
    costKopecks: number;
    avgCostMicros: number;
    currencyCode: string;
  }> {
    const state = await this.getBalanceForUpdate(context, key);

    if (quantity > state.actualQty + QTY_EPSILON) {
      await this.throwInsufficientStock(
        context,
        key,
        state.actualQty,
        quantity,
      );
    }

    const { measures, costKopecks } = applyIssueToMeasures(
      { actualQty: state.actualQty, avgCostMicros: state.avgCostMicros },
      quantity,
    );

    await this.saveBalance(
      context,
      key,
      state.id,
      measures,
      state.currencyCode,
    );

    return {
      qtyAfter: measures.actualQty,
      costKopecks,
      avgCostMicros: state.avgCostMicros,
      currencyCode: state.currencyCode,
    };
  }

  // КРИТИЧНО: the core cancel flow only inserts reversal register rows —
  // itemBalance is NOT touched by it. Every stock document's onCancel calls
  // this to roll balances back, validating non-negativity BEFORE applying
  // (the check runs against the current balance, i.e. the state AFTER the
  // ledger reversal rows were written but before the balance rollback).
  async cancelBalanceEffects(context: PostingContext): Promise<void> {
    const ledgerRepository =
      context.transactionScope.getRepository<StockLedgerRow>(
        STOCK_LEDGER_ENTRY_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    const originalRows = await ledgerRepository.findBy({
      voucherType: context.documentObjectName,
      voucherId: context.documentId,
      isCancellation: false,
    });

    // Group per item×warehouse so a document with several lines of the same
    // item is reversed as one delta (no transient negative in between).
    const deltaByPair = new Map<
      string,
      { key: ItemBalanceKey; quantityDelta: number; valueDeltaKopecks: number }
    >();

    for (const row of originalRows) {
      const itemId = row.itemId;
      const warehouseId = row.warehouseId;

      if (typeof itemId !== 'string' || typeof warehouseId !== 'string') {
        throw new ErpPostingException(
          `Stock ledger row "${row.id}" of voucher "${context.documentId}" has no item or warehouse reference`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Отмена невозможна: в движениях документа отсутствует ссылка на товар или склад.`,
          },
        );
      }

      const pairKey = `${itemId}:${warehouseId}`;
      const delta = deltaByPair.get(pairKey) ?? {
        key: { itemId, warehouseId },
        quantityDelta: 0,
        valueDeltaKopecks: 0,
      };

      delta.quantityDelta -= Number(row.actualQty ?? 0);
      delta.valueDeltaKopecks -= currencyToKopecks(
        row.stockValueDiff as CurrencyFieldValue,
      );
      deltaByPair.set(pairKey, delta);
    }

    await this.lockPairsInOrder(
      context,
      [...deltaByPair.values()].map((delta) => delta.key),
    );

    for (const {
      key,
      quantityDelta,
      valueDeltaKopecks,
    } of deltaByPair.values()) {
      const state = await this.getBalanceForUpdate(context, key);
      const qtyAfterReversal = state.actualQty + quantityDelta;

      if (qtyAfterReversal < -QTY_EPSILON) {
        await this.throwInsufficientStock(
          context,
          key,
          state.actualQty,
          -quantityDelta,
        );
      }

      const measures = applyDeltaToMeasures(
        { actualQty: state.actualQty, avgCostMicros: state.avgCostMicros },
        quantityDelta,
        valueDeltaKopecks,
      );

      await this.saveBalance(
        context,
        key,
        state.id,
        measures,
        state.currencyCode,
      );

      // The core copies qtyAfter verbatim into reversal rows; restamp them
      // with the post-cancel balance so the register stays truthful.
      const reversalRows = await ledgerRepository.findBy({
        voucherType: context.documentObjectName,
        voucherId: context.documentId,
        isCancellation: true,
        itemId: key.itemId,
        warehouseId: key.warehouseId,
      });

      if (reversalRows.length > 0) {
        await ledgerRepository.update(
          reversalRows.map((reversalRow) => reversalRow.id),
          { qtyAfter: measures.actualQty },
        );
      }
    }
  }

  async resolveRecordName(
    context: PostingContext,
    objectNameSingular: string,
    recordId: string,
  ): Promise<string> {
    const record = await context.transactionScope
      .getRepository<ErpDocumentRecord>(objectNameSingular, BYPASS_PERMISSIONS)
      .findOneBy({ id: recordId });

    return isNonEmptyString(record?.name) ? record.name : recordId;
  }

  private async saveBalance(
    context: PostingContext,
    key: ItemBalanceKey,
    existingId: string | null,
    measures: { actualQty: number; avgCostMicros: number },
    currencyCode: string,
  ): Promise<void> {
    const balanceRepository = context.transactionScope.getRepository<
      Record<string, unknown>
    >(ITEM_BALANCE_OBJECT_NAME, BYPASS_PERMISSIONS);
    const avgCost = microsToCurrency(measures.avgCostMicros, currencyCode);

    if (isDefined(existingId)) {
      await balanceRepository.update(existingId, {
        actualQty: measures.actualQty,
        avgCost,
      });

      return;
    }

    const itemName = await this.resolveRecordName(
      context,
      ITEM_OBJECT_NAME,
      key.itemId,
    );
    const warehouseName = await this.resolveRecordName(
      context,
      WAREHOUSE_OBJECT_NAME,
      key.warehouseId,
    );

    await balanceRepository.insert({
      name: `${itemName} — ${warehouseName}`,
      itemId: key.itemId,
      warehouseId: key.warehouseId,
      actualQty: measures.actualQty,
      avgCost,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });
  }

  private async throwInsufficientStock(
    context: PostingContext,
    key: ItemBalanceKey,
    availableQty: number,
    requiredQty: number,
  ): Promise<never> {
    const itemName = await this.resolveRecordName(
      context,
      ITEM_OBJECT_NAME,
      key.itemId,
    );
    const warehouseName = await this.resolveRecordName(
      context,
      WAREHOUSE_OBJECT_NAME,
      key.warehouseId,
    );
    const availableRu = formatQuantityRu(availableQty);
    const requiredRu = formatQuantityRu(requiredQty);

    throw new ErpPostingException(
      `Insufficient stock for item "${key.itemId}" in warehouse "${key.warehouseId}": available ${availableQty}, required ${requiredQty}`,
      ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
      {
        userFriendlyMessage: msg`Недостаточно остатка „${itemName}“ на складе „${warehouseName}“: доступно ${availableRu}, требуется ${requiredRu}`,
      },
    );
  }

  private itemBalanceTableReference(workspaceId: string): string {
    const { flatObjectMetadataMaps, objectIdByNameSingular } =
      getWorkspaceContext();
    const objectMetadataId = objectIdByNameSingular[ITEM_BALANCE_OBJECT_NAME];

    if (!isDefined(objectMetadataId)) {
      throw new ErpPostingException(
        `Object "${ITEM_BALANCE_OBJECT_NAME}" does not exist in workspace "${workspaceId}"`,
        ERP_POSTING_EXCEPTION_CODE.UNKNOWN_DOCUMENT_OBJECT,
      );
    }

    const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityId: objectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    return `${escapeIdentifier(
      getWorkspaceSchemaName(workspaceId),
    )}.${escapeIdentifier(computeObjectTargetTable(flatObjectMetadata))}`;
  }
}
