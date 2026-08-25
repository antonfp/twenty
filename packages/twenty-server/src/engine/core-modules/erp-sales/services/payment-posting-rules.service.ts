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

const PAYMENT_OBJECT_NAME = 'payment';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const PAYMENT_NUMBER_PREFIX = 'PM';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

@Injectable()
export class PaymentPostingRulesService implements PostingRulesProvider {
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
        `Payment "${document.id}" has non-positive amount`,
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
        SALES_INVOICE_OBJECT_NAME,
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
          docType: PAYMENT_OBJECT_NAME,
          prefix: PAYMENT_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const documentName = `Оплата № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    const paymentRepository =
      context.transactionScope.getRepository<ErpDocumentRecord>(
        PAYMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      );

    await paymentRepository.update(document.id, {
      number: documentNumber,
      name: documentName,
    });

    const payerCompanyId =
      typeof document.payerId === 'string'
        ? document.payerId
        : typeof invoice.customerId === 'string'
          ? invoice.customerId
          : null;

    const partyLedgerEntryRow: ErpPartyLedgerEntryRow = {
      name: documentName,
      companyId: payerCompanyId,
      organizationId:
        typeof invoice.organizationId === 'string'
          ? invoice.organizationId
          : null,
      voucherType: PAYMENT_OBJECT_NAME,
      voucherId: document.id,
      // Payment decreases the customer's receivable: negative signed amount.
      amount: kopecksToCurrency(-amountKopecks, currencyCode),
      postingDate: context.postingDate,
      isCancelled: false,
      isCancellation: false,
    };

    // Same contract-boundary cast as in SalesInvoicePostingRulesService: the
    // row follows the installed register object, PostingService inserts it
    // verbatim.
    return [partyLedgerEntryRow] as unknown as PartyLedgerEntryInput[];
  }

  private async loadPostedInvoice(
    context: PostingContext,
    document: ErpDocumentRecord,
  ): Promise<ErpDocumentRecord> {
    const salesInvoiceId = document.salesInvoiceId;

    if (!isDefined(salesInvoiceId) || typeof salesInvoiceId !== 'string') {
      throw new ErpPostingException(
        `Payment "${document.id}" is not linked to a sales invoice`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Оплата должна быть привязана к счёту.`,
        },
      );
    }

    const invoice = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        SALES_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: salesInvoiceId });

    if (!isDefined(invoice)) {
      throw new ErpPostingException(
        `Sales invoice "${salesInvoiceId}" linked to payment "${document.id}" not found`,
        ERP_POSTING_EXCEPTION_CODE.DOCUMENT_NOT_FOUND,
        {
          userFriendlyMessage: msg`Счёт, к которому привязана оплата, не найден.`,
        },
      );
    }

    if (invoice.docStatus !== DOC_STATUS.POSTED) {
      throw new ErpPostingException(
        `Sales invoice "${salesInvoiceId}" is ${String(invoice.docStatus)}, expected ${DOC_STATUS.POSTED}`,
        ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
        {
          userFriendlyMessage: msg`Оплату можно провести только по проведённому счёту.`,
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
