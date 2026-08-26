import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
  type PostingRulesProvider,
  type StockLedgerEntryInput,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  kopecksToCurrency,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';
import {
  assertStockDocumentLines,
  assertWarehouseAssigned,
} from 'src/engine/core-modules/erp-stock/utils/assert-stock-document.util';
import { microsToCurrency } from 'src/engine/core-modules/erp-stock/utils/item-balance-math.util';

const SALES_SHIPMENT_OBJECT_NAME = 'salesShipment';
const SALES_SHIPMENT_LINE_OBJECT_NAME = 'salesShipmentLine';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SALES_SHIPMENT_NUMBER_PREFIX = 'SH';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class SalesShipmentPostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
    private readonly itemBalanceService: ItemBalanceService,
  ) {}

  async validate(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<void> {
    assertStockDocumentLines(document, lines, { requirePrice: false });
    assertWarehouseAssigned(document);
    await this.assertLinkedInvoicePosted(context, document);
  }

  // Side effects (line costAmount, totalCost, numbering, balance updates)
  // live here because the posting contract has no dedicated apply hook.
  async getStockEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<StockLedgerEntryInput[]> {
    const warehouseId = assertWarehouseAssigned(document);

    const lineRepository =
      context.transactionScope.getRepository<ErpDocumentLineRecord>(
        SALES_SHIPMENT_LINE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: SALES_SHIPMENT_OBJECT_NAME,
          prefix: SALES_SHIPMENT_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });
    const documentName = `Реализация № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const ledgerRows: ErpStockLedgerEntryRow[] = [];
    let totalCostKopecks = 0;
    let currencyCode: string | null = null;

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

      totalCostKopecks += issueResult.costKopecks;
      currencyCode = currencyCode ?? issueResult.currencyCode;

      if (
        currencyToKopecks(line.costAmount as CurrencyFieldValue) !==
        issueResult.costKopecks
      ) {
        await lineRepository.update(line.id, {
          costAmount: kopecksToCurrency(
            issueResult.costKopecks,
            issueResult.currencyCode,
          ),
        });
      }

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
        voucherType: SALES_SHIPMENT_OBJECT_NAME,
        voucherId: document.id,
        isCancelled: false,
        isCancellation: false,
      });
    }

    const documentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SALES_SHIPMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await documentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
      totalCost: kopecksToCurrency(
        totalCostKopecks,
        currencyCode ?? RUB_CURRENCY_CODE,
      ),
    });

    return ledgerRows as unknown as StockLedgerEntryInput[];
  }

  // Отмена возвращает остаток по costAmount строк (через stockValueDiff
  // реверсируемых движений); средняя не пересчитывается назад по истории —
  // упрощение, задокументировано в README модуля. Line costAmount and the
  // document totalCost are kept as the historical record of the posting.
  async onCancel(
    context: PostingContext,
    _document: ErpDocumentRecord,
  ): Promise<void> {
    await this.itemBalanceService.cancelBalanceEffects(context);
  }

  private async assertLinkedInvoicePosted(
    context: PostingContext,
    document: ErpDocumentRecord,
  ): Promise<void> {
    const salesInvoiceId = document.salesInvoiceId;

    if (!isDefined(salesInvoiceId) || typeof salesInvoiceId !== 'string') {
      return;
    }

    const invoice = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        SALES_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: salesInvoiceId });

    if (!isDefined(invoice)) {
      throw new ErpPostingException(
        `Sales invoice "${salesInvoiceId}" linked to shipment "${document.id}" not found`,
        ERP_POSTING_EXCEPTION_CODE.DOCUMENT_NOT_FOUND,
        {
          userFriendlyMessage: msg`Счёт, к которому привязана реализация, не найден.`,
        },
      );
    }

    if (invoice.docStatus !== DOC_STATUS.POSTED) {
      throw new ErpPostingException(
        `Sales invoice "${salesInvoiceId}" is ${String(invoice.docStatus)}, expected ${DOC_STATUS.POSTED}`,
        ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
        {
          userFriendlyMessage: msg`Реализацию можно провести только по проведённому счёту.`,
        },
      );
    }
  }
}
