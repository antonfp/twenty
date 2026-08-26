import { isNonEmptyString } from '@sniptt/guards';

import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
  type PostingRulesProvider,
  type StockLedgerEntryInput,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  computeLineAmountKopecks,
  currencyToKopecks,
  kopecksToCurrency,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';
import {
  assertStockDocumentLines,
  assertWarehouseAssigned,
  resolveLinesCurrencyCode,
} from 'src/engine/core-modules/erp-stock/utils/assert-stock-document.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

export type InflowDocumentConfig = {
  objectNameSingular: string;
  lineObjectNameSingular: string;
  numberPrefix: string;
  // «Поступление» / «Оприходование» — начало имени документа.
  documentNameNominative: string;
  // goodsReceipt has a total CURRENCY field, goodsPosting doesn't.
  updatesDocumentTotal: boolean;
};

// goodsReceipt and goodsPosting are the same inflow flow (lines with
// price/amount, +qty movements, average recompute) — they differ only by
// numbering prefix, document naming and the total field.
export abstract class InflowDocumentPostingRulesService implements PostingRulesProvider {
  protected constructor(
    private readonly documentNumberingService: DocumentNumberingService,
    private readonly itemBalanceService: ItemBalanceService,
    private readonly config: InflowDocumentConfig,
  ) {}

  validate(
    _context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): void {
    assertStockDocumentLines(document, lines, { requirePrice: true });
    assertWarehouseAssigned(document);
  }

  // Side effects (line amounts, totals, numbering, balance updates) live here
  // because the posting contract has no dedicated apply hook; getStockEntries
  // runs once, after every provider validated, inside the posting transaction.
  async getStockEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<StockLedgerEntryInput[]> {
    const warehouseId = assertWarehouseAssigned(document);
    const currencyCode = resolveLinesCurrencyCode(lines);

    const lineRepository =
      context.transactionScope.getRepository<ErpDocumentLineRecord>(
        this.config.lineObjectNameSingular,
        BYPASS_PERMISSIONS,
      );

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: this.config.objectNameSingular,
          prefix: this.config.numberPrefix,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });
    const documentName = `${this.config.documentNameNominative} № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const ledgerRows: ErpStockLedgerEntryRow[] = [];
    let totalKopecks = 0;

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const priceKopecks = currencyToKopecks(line.price as CurrencyFieldValue);
      const amountKopecks = computeLineAmountKopecks(quantity, priceKopecks);

      totalKopecks += amountKopecks;

      if (
        currencyToKopecks(line.amount as CurrencyFieldValue) !== amountKopecks
      ) {
        await lineRepository.update(line.id, {
          amount: kopecksToCurrency(amountKopecks, currencyCode),
        });
      }

      const { qtyAfter } = await this.itemBalanceService.applyReceipt(
        context,
        { itemId: line.itemId as string, warehouseId },
        quantity,
        amountKopecks,
        currencyCode,
      );

      ledgerRows.push({
        name: documentName,
        itemId: line.itemId as string,
        warehouseId,
        organizationId:
          typeof document.organizationId === 'string'
            ? document.organizationId
            : null,
        actualQty: quantity,
        qtyAfter,
        valuationRate: kopecksToCurrency(priceKopecks, currencyCode),
        stockValueDiff: kopecksToCurrency(amountKopecks, currencyCode),
        voucherType: this.config.objectNameSingular,
        voucherId: document.id,
        isCancelled: false,
        isCancellation: false,
      });
    }

    const documentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        this.config.objectNameSingular,
        BYPASS_PERMISSIONS,
      );

    await documentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
      ...(this.config.updatesDocumentTotal
        ? { total: kopecksToCurrency(totalKopecks, currencyCode) }
        : {}),
    });

    return ledgerRows as unknown as StockLedgerEntryInput[];
  }

  // The core reverses ledger rows only; balances are rolled back here, with
  // non-negativity validated inside cancelBalanceEffects (see module README).
  async onCancel(
    context: PostingContext,
    _document: ErpDocumentRecord,
  ): Promise<void> {
    await this.itemBalanceService.cancelBalanceEffects(context);
  }
}
