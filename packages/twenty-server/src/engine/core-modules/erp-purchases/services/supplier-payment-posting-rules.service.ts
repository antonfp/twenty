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
  PAYMENT_STATUS,
} from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  kopecksToCurrency,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const SUPPLIER_PAYMENT_OBJECT_NAME = 'supplierPayment';
const SUPPLIER_INVOICE_OBJECT_NAME = 'supplierInvoice';
const SUPPLIER_PAYMENT_NUMBER_PREFIX = 'PO';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class SupplierPaymentPostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
  ) {}

  async validate(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<void> {
    const amountKopecks = currencyToKopecks(
      document.amount as CurrencyFieldValue,
    );

    if (!(amountKopecks > 0)) {
      throw new ErpPostingException(
        `Supplier payment "${document.id}" has non-positive amount`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Сумма оплаты должна быть больше нуля.`,
        },
      );
    }

    await this.loadPostedInvoice(context, document);
  }

  // Side effects (invoice paidAmount/paymentStatus, numbering) live here
  // because the posting contract has no dedicated apply hook; getPartyEntries
  // runs once, after validation, inside the posting transaction.
  async getPartyEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<PartyLedgerEntryInput[]> {
    const invoice = await this.loadPostedInvoice(context, document);

    const amountKopecks = currencyToKopecks(
      document.amount as CurrencyFieldValue,
    );
    const invoiceTotalKopecks = currencyToKopecks(
      invoice.total as CurrencyFieldValue,
    );
    const paidAmountKopecks =
      currencyToKopecks(invoice.paidAmount as CurrencyFieldValue) +
      amountKopecks;
    const currencyCode = this.resolveCurrencyCode(document, invoice);

    const invoiceRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SUPPLIER_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await invoiceRepository.update(invoice.id, {
      paidAmount: kopecksToCurrency(paidAmountKopecks, currencyCode),
      paymentStatus:
        paidAmountKopecks >= invoiceTotalKopecks
          ? PAYMENT_STATUS.PAID
          : PAYMENT_STATUS.PARTIALLY_PAID,
    });

    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: SUPPLIER_PAYMENT_OBJECT_NAME,
          prefix: SUPPLIER_PAYMENT_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const documentName = `Оплата поставщику № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const paymentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SUPPLIER_PAYMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await paymentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
    });

    const supplierCompanyId =
      typeof document.supplierId === 'string'
        ? document.supplierId
        : typeof invoice.supplierId === 'string'
          ? invoice.supplierId
          : null;

    const partyLedgerEntryRow: ErpPartyLedgerEntryRow = {
      name: documentName,
      companyId: supplierCompanyId,
      organizationId:
        typeof invoice.organizationId === 'string'
          ? invoice.organizationId
          : null,
      voucherType: SUPPLIER_PAYMENT_OBJECT_NAME,
      voucherId: document.id,
      // Единый регистр: '+' = долг перед поставщиком погашен.
      amount: kopecksToCurrency(amountKopecks, currencyCode),
      postingDate: context.postingDate,
      isCancelled: false,
      isCancellation: false,
    };

    // Same contract-boundary cast as in SupplierInvoicePostingRulesService:
    // the row follows the installed register object, PostingService inserts
    // it verbatim.
    return [partyLedgerEntryRow] as unknown as PartyLedgerEntryInput[];
  }

  // Reversal rows fix the ledger; the invoice's denormalized paid state is
  // rolled back here, inside the same cancel transaction.
  async onCancel(
    context: PostingContext,
    document: ErpDocumentRecord,
  ): Promise<void> {
    const supplierInvoiceId = document.supplierInvoiceId;

    if (
      !isDefined(supplierInvoiceId) ||
      typeof supplierInvoiceId !== 'string'
    ) {
      return;
    }

    const invoiceRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        SUPPLIER_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );
    const invoice = await invoiceRepository.findOneBy({
      id: supplierInvoiceId,
    });

    if (!isDefined(invoice)) {
      return;
    }

    const amountKopecks = currencyToKopecks(
      document.amount as CurrencyFieldValue,
    );
    const invoiceTotalKopecks = currencyToKopecks(
      invoice.total as CurrencyFieldValue,
    );
    const paidAmountKopecks = Math.max(
      currencyToKopecks(invoice.paidAmount as CurrencyFieldValue) -
        amountKopecks,
      0,
    );
    const currencyCode = this.resolveCurrencyCode(document, invoice);

    await invoiceRepository.update(invoice.id, {
      paidAmount: kopecksToCurrency(paidAmountKopecks, currencyCode),
      paymentStatus:
        paidAmountKopecks <= 0
          ? PAYMENT_STATUS.UNPAID
          : paidAmountKopecks >= invoiceTotalKopecks
            ? PAYMENT_STATUS.PAID
            : PAYMENT_STATUS.PARTIALLY_PAID,
    });
  }

  private async loadPostedInvoice(
    context: PostingContext,
    document: ErpDocumentRecord,
  ): Promise<ErpDocumentRecord> {
    const supplierInvoiceId = document.supplierInvoiceId;

    if (
      !isDefined(supplierInvoiceId) ||
      typeof supplierInvoiceId !== 'string'
    ) {
      throw new ErpPostingException(
        `Supplier payment "${document.id}" is not linked to a supplier invoice`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Оплата должна быть привязана к счёту поставщика.`,
        },
      );
    }

    const invoice = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        SUPPLIER_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: supplierInvoiceId });

    if (!isDefined(invoice)) {
      throw new ErpPostingException(
        `Supplier invoice "${supplierInvoiceId}" linked to supplier payment "${document.id}" not found`,
        ERP_POSTING_EXCEPTION_CODE.DOCUMENT_NOT_FOUND,
        {
          userFriendlyMessage: msg`Счёт поставщика, к которому привязана оплата, не найден.`,
        },
      );
    }

    if (invoice.docStatus !== DOC_STATUS.POSTED) {
      throw new ErpPostingException(
        `Supplier invoice "${supplierInvoiceId}" is ${String(invoice.docStatus)}, expected ${DOC_STATUS.POSTED}`,
        ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
        {
          userFriendlyMessage: msg`Оплату можно провести только по проведённому счёту поставщика.`,
        },
      );
    }

    return invoice;
  }

  private resolveCurrencyCode(
    document: ErpDocumentRecord,
    invoice: ErpDocumentRecord,
  ): string {
    const paymentCurrencyCode = (document.amount as CurrencyFieldValue)
      ?.currencyCode;

    if (isNonEmptyString(paymentCurrencyCode)) {
      return paymentCurrencyCode;
    }

    const invoiceCurrencyCode = (invoice.total as CurrencyFieldValue)
      ?.currencyCode;

    if (isNonEmptyString(invoiceCurrencyCode)) {
      return invoiceCurrencyCode;
    }

    return RUB_CURRENCY_CODE;
  }
}
