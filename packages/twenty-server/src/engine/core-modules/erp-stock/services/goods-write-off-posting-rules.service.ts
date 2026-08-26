import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';

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

const GOODS_WRITE_OFF_OBJECT_NAME = 'goodsWriteOff';
const GOODS_WRITE_OFF_NUMBER_PREFIX = 'WO';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

// Списание: issue at the moving average. The write-off cost lands only in
// the stock ledger — goodsWriteOffLine has no costAmount field.
@Injectable()
export class GoodsWriteOffPostingRulesService implements PostingRulesProvider {
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
    assertWarehouseAssigned(document);
  }

  async getStockEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<StockLedgerEntryInput[]> {
    const warehouseId = assertWarehouseAssigned(document);

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: GOODS_WRITE_OFF_OBJECT_NAME,
          prefix: GOODS_WRITE_OFF_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });
    const documentName = `Списание № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const ledgerRows: ErpStockLedgerEntryRow[] = [];

    await this.itemBalanceService.lockPairsInOrder(
      context,
      lines.map((line) => ({ itemId: line.itemId as string, warehouseId })),
    );

    for (const line of lines) {
      const quantity = Number(line.quantity);
      const issueResult = await this.itemBalanceService.applyIssue(
        context,
        { itemId: line.itemId as string, warehouseId },
        quantity,
      );

      ledgerRows.push({
        name: documentName,
        itemId: line.itemId as string,
        warehouseId,
        organizationId:
          typeof document.organizationId === 'string'
            ? document.organizationId
            : null,
        actualQty: -quantity,
        qtyAfter: issueResult.qtyAfter,
        valuationRate: microsToCurrency(
          issueResult.avgCostMicros,
          issueResult.currencyCode,
        ),
        stockValueDiff: kopecksToCurrency(
          -issueResult.costKopecks,
          issueResult.currencyCode,
        ),
        voucherType: GOODS_WRITE_OFF_OBJECT_NAME,
        voucherId: document.id,
        isCancelled: false,
        isCancellation: false,
      });
    }

    const documentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        GOODS_WRITE_OFF_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await documentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
    });

    return ledgerRows as unknown as StockLedgerEntryInput[];
  }

  // The core reverses ledger rows only; the balance is restored here at the
  // written-off cost, with non-negativity validated.
  async onCancel(
    context: PostingContext,
    _document: ErpDocumentRecord,
  ): Promise<void> {
    await this.itemBalanceService.cancelBalanceEffects(context);
  }
}
