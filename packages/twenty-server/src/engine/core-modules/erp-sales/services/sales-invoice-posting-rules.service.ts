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
  type PartyLedgerEntryInput,
  type PostingContext,
  type PostingRulesProvider,
} from 'src/engine/core-modules/erp/types/posting.types';
import {
  type CurrencyFieldValue,
  type ErpPartyLedgerEntryRow,
} from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import { computeInvoiceTotals } from 'src/engine/core-modules/erp-sales/utils/compute-invoice-totals.util';
import {
  currencyToKopecks,
  kopecksToCurrency,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SALES_INVOICE_LINE_OBJECT_NAME = 'salesInvoiceLine';
const SALES_INVOICE_NUMBER_PREFIX = 'SI';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class SalesInvoicePostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
  ) {}

  validate(
    _context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): void {
    if (lines.length === 0) {
      throw new ErpPostingException(
        `Sales invoice "${document.id}" has no lines`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Счёт нельзя провести без строк: добавьте хотя бы одну позицию.`,
        },
      );
    }

    for (const line of lines) {
      const quantity = Number(line.quantity ?? 0);

      if (!(quantity > 0)) {
        throw new ErpPostingException(
          `Sales invoice line "${line.id}" has non-positive quantity`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Количество в каждой строке счёта должно быть больше нуля.`,
          },
        );
      }

      const priceKopecks = currencyToKopecks(line.price as CurrencyFieldValue);

      if (priceKopecks < 0) {
        throw new ErpPostingException(
          `Sales invoice line "${line.id}" has negative price`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Цена в строке счёта не может быть отрицательной.`,
          },
        );
      }
    }
  }

  // Side effects (totals, numbering, line amounts) live here because the
  // posting contract has no dedicated apply hook; getPartyEntries runs once,
  // after every provider validated, inside the posting transaction.
  async getPartyEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): Promise<PartyLedgerEntryInput[]> {
    const { computedLines, totalKopecks, vatTotalKopecks } =
      computeInvoiceTotals(lines);
    const currencyCode = this.resolveCurrencyCode(lines);

    const lineRepository =
      context.transactionScope.getRepository<ErpDocumentLineRecord>(
        SALES_INVOICE_LINE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    for (const { line, amountKopecks } of computedLines) {
      if (
        currencyToKopecks(line.amount as CurrencyFieldValue) !== amountKopecks
      ) {
        await lineRepository.update(line.id, {
          amount: kopecksToCurrency(amountKopecks, currencyCode),
        });
      }
    }

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: SALES_INVOICE_OBJECT_NAME,
          prefix: SALES_INVOICE_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const documentName = `Счёт № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const invoiceRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SALES_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await invoiceRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
      total: kopecksToCurrency(totalKopecks, currencyCode),
      vatTotal: kopecksToCurrency(vatTotalKopecks, currencyCode),
    });

    const partyLedgerEntryRow: ErpPartyLedgerEntryRow = {
      name: documentName,
      companyId:
        typeof document.customerId === 'string' ? document.customerId : null,
      organizationId:
        typeof document.organizationId === 'string'
          ? document.organizationId
          : null,
      voucherType: SALES_INVOICE_OBJECT_NAME,
      voucherId: document.id,
      amount: kopecksToCurrency(totalKopecks, currencyCode),
      postingDate: context.postingDate,
      isCancelled: false,
      isCancellation: false,
    };

    // The register row shape follows the installed partyLedgerEntry object,
    // not the older core PartyLedgerEntryInput type; PostingService inserts
    // rows verbatim, so the cast is only a contract-boundary formality.
    return [partyLedgerEntryRow] as unknown as PartyLedgerEntryInput[];
  }

  private resolveCurrencyCode(lines: ErpDocumentLineRecord[]): string {
    for (const line of lines) {
      const currencyCode = (line.price as CurrencyFieldValue)?.currencyCode;

      if (isNonEmptyString(currencyCode)) {
        return currencyCode;
      }
    }

    return RUB_CURRENCY_CODE;
  }
}
