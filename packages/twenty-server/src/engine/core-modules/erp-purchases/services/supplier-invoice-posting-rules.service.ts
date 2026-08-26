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

const SUPPLIER_INVOICE_OBJECT_NAME = 'supplierInvoice';
const SUPPLIER_INVOICE_LINE_OBJECT_NAME = 'supplierInvoiceLine';
const SUPPLIER_INVOICE_NUMBER_PREFIX = 'PI';
const SUPPLIER_PAYMENT_OBJECT_NAME = 'supplierPayment';
const GOODS_RECEIPT_OBJECT_NAME = 'goodsReceipt';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class SupplierInvoicePostingRulesService implements PostingRulesProvider {
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
        `Supplier invoice "${document.id}" has no lines`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Счёт поставщика нельзя провести без строк: добавьте хотя бы одну позицию.`,
        },
      );
    }

    for (const line of lines) {
      const quantity = Number(line.quantity ?? 0);

      if (!(quantity > 0)) {
        throw new ErpPostingException(
          `Supplier invoice line "${line.id}" has non-positive quantity`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Количество в каждой строке счёта должно быть больше нуля.`,
          },
        );
      }

      const priceKopecks = currencyToKopecks(line.price as CurrencyFieldValue);

      if (priceKopecks < 0) {
        throw new ErpPostingException(
          `Supplier invoice line "${line.id}" has negative price`,
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
        SUPPLIER_INVOICE_LINE_OBJECT_NAME,
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
          docType: SUPPLIER_INVOICE_OBJECT_NAME,
          prefix: SUPPLIER_INVOICE_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const documentName = `Счёт поставщика № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const invoiceRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SUPPLIER_INVOICE_OBJECT_NAME,
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
        typeof document.supplierId === 'string' ? document.supplierId : null,
      organizationId:
        typeof document.organizationId === 'string'
          ? document.organizationId
          : null,
      voucherType: SUPPLIER_INVOICE_OBJECT_NAME,
      voucherId: document.id,
      // Единый регистр: '-' = мы должны контрагенту (закупка увеличивает наш долг поставщику).
      amount: kopecksToCurrency(-totalKopecks, currencyCode),
      postingDate: context.postingDate,
      isCancelled: false,
      isCancellation: false,
    };

    // The register row shape follows the installed partyLedgerEntry object,
    // not the older core PartyLedgerEntryInput type; PostingService inserts
    // rows verbatim, so the cast is only a contract-boundary formality.
    return [partyLedgerEntryRow] as unknown as PartyLedgerEntryInput[];
  }

  // Ruling: cancelling a posted invoice is blocked while any POSTED payment
  // is still linked to it — cancelled payments don't count. Checked here
  // (not in validate) because the block applies to cancel, not post.
  // withDeleted — a soft-deleted payment is invisible to a plain lookup and
  // would wrongly let the invoice cancel out from under it while still
  // POSTED (mirrors the goods receipt check below).
  async onCancel(
    context: PostingContext,
    document: ErpDocumentRecord,
  ): Promise<void> {
    const postedPayment = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        SUPPLIER_PAYMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOne({
        where: {
          supplierInvoiceId: document.id,
          docStatus: DOC_STATUS.POSTED,
        },
        withDeleted: true,
      });

    if (isDefined(postedPayment)) {
      throw new ErpPostingException(
        `Cannot cancel supplier invoice "${document.id}": posted payment "${postedPayment.id}" is still linked to it`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Сначала отмените оплаты по счёту.`,
        },
      );
    }

    // Mirrors the payment check: a POSTED goods receipt already moved stock
    // in against this invoice. withDeleted — a soft-deleted receipt is
    // invisible to a plain lookup and would wrongly let the invoice cancel
    // out from under it while it's still POSTED.
    const postedGoodsReceipt = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        GOODS_RECEIPT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOne({
        where: {
          supplierInvoiceId: document.id,
          docStatus: DOC_STATUS.POSTED,
        },
        withDeleted: true,
      });

    if (isDefined(postedGoodsReceipt)) {
      throw new ErpPostingException(
        `Cannot cancel supplier invoice "${document.id}": posted goods receipt "${postedGoodsReceipt.id}" is still linked to it`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Сначала отмените поступления по счёту.`,
        },
      );
    }
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
