import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
  type PostingRulesProvider,
  type StockLedgerEntryInput,
} from 'src/engine/core-modules/erp/types/posting.types';
import { kopecksToCurrency } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';
import {
  assertStockDocumentLines,
  assertWarehouseAssigned,
} from 'src/engine/core-modules/erp-stock/utils/assert-stock-document.util';
import { microsToCurrency } from 'src/engine/core-modules/erp-stock/utils/item-balance-math.util';

const STOCK_TRANSFER_OBJECT_NAME = 'stockTransfer';
const STOCK_TRANSFER_NUMBER_PREFIX = 'TR';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class StockTransferPostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
    private readonly itemBalanceService: ItemBalanceService,
  ) {}

  validate(
    _context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): void {
    assertStockDocumentLines(document, lines, { requirePrice: false });
    const warehouseFromId = assertWarehouseAssigned(
      document,
      'warehouseFromId',
    );
    const warehouseToId = assertWarehouseAssigned(document, 'warehouseToId');

    if (warehouseFromId === warehouseToId) {
      throw new ErpPostingException(
        `Stock transfer "${document.id}" has identical source and target warehouses`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Склад-отправитель и склад-получатель должны различаться.`,
        },
      );
    }
  }

  // Per line: issue from warehouseFrom at the moving average, receive into
  // warehouseTo at exactly the issued value — the transfer never creates or
  // destroys stock value.
  async getStockEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<StockLedgerEntryInput[]> {
    const warehouseFromId = assertWarehouseAssigned(
      document,
      'warehouseFromId',
    );
    const warehouseToId = assertWarehouseAssigned(document, 'warehouseToId');

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: STOCK_TRANSFER_OBJECT_NAME,
          prefix: STOCK_TRANSFER_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });
    const documentName = `Перемещение № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const organizationId =
      typeof document.organizationId === 'string'
        ? document.organizationId
        : null;
    const ledgerRows: ErpStockLedgerEntryRow[] = [];

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const itemId = line.itemId as string;

      const issueResult = await this.itemBalanceService.applyIssue(
        context,
        { itemId, warehouseId: warehouseFromId },
        quantity,
      );
      const receiptResult = await this.itemBalanceService.applyReceipt(
        context,
        { itemId, warehouseId: warehouseToId },
        quantity,
        issueResult.costKopecks,
        issueResult.currencyCode,
      );

      const valuationRate = microsToCurrency(
        issueResult.avgCostMicros,
        issueResult.currencyCode,
      );
      const sharedRowFields = {
        name: documentName,
        itemId,
        organizationId,
        voucherType: STOCK_TRANSFER_OBJECT_NAME,
        voucherId: document.id,
        isCancelled: false,
        isCancellation: false,
      };

      ledgerRows.push(
        {
          ...sharedRowFields,
          warehouseId: warehouseFromId,
          actualQty: -quantity,
          qtyAfter: issueResult.qtyAfter,
          valuationRate,
          stockValueDiff: kopecksToCurrency(
            -issueResult.costKopecks,
            issueResult.currencyCode,
          ),
        },
        {
          ...sharedRowFields,
          warehouseId: warehouseToId,
          actualQty: quantity,
          qtyAfter: receiptResult.qtyAfter,
          valuationRate,
          stockValueDiff: kopecksToCurrency(
            issueResult.costKopecks,
            issueResult.currencyCode,
          ),
        },
      );
    }

    const documentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        STOCK_TRANSFER_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await documentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
    });

    return ledgerRows as unknown as StockLedgerEntryInput[];
  }

  // The core reverses ledger rows only; both warehouses' balances are rolled
  // back here, with non-negativity validated (the target warehouse may have
  // shipped the goods on since the transfer).
  async onCancel(
    context: PostingContext,
    _document: ErpDocumentRecord,
  ): Promise<void> {
    await this.itemBalanceService.cancelBalanceEffects(context);
  }
}
