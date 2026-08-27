import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type ErpGlEntryRow,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  kopecksToCurrency,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { type AccountTurnover } from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';
import {
  computeMonthCloseLegs,
  firstDayOfNextMonth,
  MONTH_CLOSE_SOURCE_ACCOUNT_CODES,
} from 'src/engine/core-modules/erp-accounting/utils/compute-month-close.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

const ACCOUNT_OBJECT_NAME = 'account';
const STOCK_LEDGER_ENTRY_OBJECT_NAME = 'stockLedgerEntry';
const GL_ENTRY_OBJECT_NAME = 'glEntry';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SUPPLIER_INVOICE_OBJECT_NAME = 'supplierInvoice';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

// Коды рабочего плана счетов (ruling «типовые проводки MVP»); счета ищутся
// по code в справочнике account на каждом проведении — план счетов
// редактируем пользователем, id зашивать нельзя.
const ACCOUNT_CODE = {
  CASH: '51',
  RECEIVABLE: '62.01',
  PAYABLE: '60.01',
  REVENUE: '90.01.1',
  COST_OF_SALES: '90.02.1',
  VAT_ON_SALES: '90.03',
  VAT_SETTLEMENT: '68.02',
  VAT_ON_PURCHASES: '19.04',
  GENERAL_EXPENSES: '26',
  SHORTAGE: '94',
  GOODS: '41.01',
  OTHER_INCOME: '91.01',
} as const;

type GlEntryDraft = {
  debitCode: string;
  creditCode: string;
  amountKopecks: number;
  partyId?: string | null;
};

// Glue-слой автопроводок (ruling): типовые проводки всех документов блоков
// живут здесь, а не в erp-sales/erp-purchases/erp-stock. Суммы читаются из
// перечитанного ядром документа (итоги уже записаны основным провайдером)
// либо из строк stockLedgerEntry этой же транзакции. stockTransfer проводок
// не имеет (склад — аналитика регистра, не субсчёт) и не регистрируется.
@Injectable()
export class GlContributorsService {
  async salesInvoiceGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const totalKopecks = currencyToKopecks(
      document.total as CurrencyFieldValue,
    );
    const vatKopecks = currencyToKopecks(
      document.vatTotal as CurrencyFieldValue,
    );
    const partyId =
      typeof document.customerId === 'string' ? document.customerId : null;

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.total as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.RECEIVABLE,
          creditCode: ACCOUNT_CODE.REVENUE,
          amountKopecks: totalKopecks,
          partyId,
        },
        {
          debitCode: ACCOUNT_CODE.VAT_ON_SALES,
          creditCode: ACCOUNT_CODE.VAT_SETTLEMENT,
          amountKopecks: vatKopecks,
        },
      ],
    );
  }

  async paymentGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const amountKopecks = currencyToKopecks(
      document.amount as CurrencyFieldValue,
    );
    const partyId = await this.resolveDocumentPartyId(context, document, {
      documentFieldName: 'payerId',
      invoiceObjectName: SALES_INVOICE_OBJECT_NAME,
      invoiceIdFieldName: 'salesInvoiceId',
      invoicePartyFieldName: 'customerId',
    });

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.amount as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.CASH,
          creditCode: ACCOUNT_CODE.RECEIVABLE,
          amountKopecks,
          partyId,
        },
      ],
    );
  }

  // Вычет НДС (68.02/19.04) сразу при проведении счёта поставщика —
  // упрощение MVP, задокументировано в ruling.
  async supplierInvoiceGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const totalKopecks = currencyToKopecks(
      document.total as CurrencyFieldValue,
    );
    const vatKopecks = currencyToKopecks(
      document.vatTotal as CurrencyFieldValue,
    );
    const partyId =
      typeof document.supplierId === 'string' ? document.supplierId : null;

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.total as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.GENERAL_EXPENSES,
          creditCode: ACCOUNT_CODE.PAYABLE,
          amountKopecks: totalKopecks - vatKopecks,
          partyId,
        },
        {
          debitCode: ACCOUNT_CODE.VAT_ON_PURCHASES,
          creditCode: ACCOUNT_CODE.PAYABLE,
          amountKopecks: vatKopecks,
          partyId,
        },
        {
          debitCode: ACCOUNT_CODE.VAT_SETTLEMENT,
          creditCode: ACCOUNT_CODE.VAT_ON_PURCHASES,
          amountKopecks: vatKopecks,
        },
      ],
    );
  }

  async supplierPaymentGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const amountKopecks = currencyToKopecks(
      document.amount as CurrencyFieldValue,
    );
    const partyId = await this.resolveDocumentPartyId(context, document, {
      documentFieldName: 'supplierId',
      invoiceObjectName: SUPPLIER_INVOICE_OBJECT_NAME,
      invoiceIdFieldName: 'supplierInvoiceId',
      invoicePartyFieldName: 'supplierId',
    });

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.amount as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.PAYABLE,
          creditCode: ACCOUNT_CODE.CASH,
          amountKopecks,
          partyId,
        },
      ],
    );
  }

  // НДС по товарным поступлениям остаётся на связанном supplierInvoice —
  // упрощение MVP, задокументировано в ruling.
  async goodsReceiptGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const totalKopecks = currencyToKopecks(
      document.total as CurrencyFieldValue,
    );
    const partyId =
      typeof document.supplierId === 'string' ? document.supplierId : null;

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.total as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.GOODS,
          creditCode: ACCOUNT_CODE.PAYABLE,
          amountKopecks: totalKopecks,
          partyId,
        },
      ],
    );
  }

  async salesShipmentGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const totalCostKopecks = currencyToKopecks(
      document.totalCost as CurrencyFieldValue,
    );

    return this.buildRows(
      context,
      document,
      this.resolveCurrencyCode(document.totalCost as CurrencyFieldValue),
      [
        {
          debitCode: ACCOUNT_CODE.COST_OF_SALES,
          creditCode: ACCOUNT_CODE.GOODS,
          amountKopecks: totalCostKopecks,
        },
      ],
    );
  }

  // Стоимость по средней = Σ |stockValueDiff| строк регистра этого документа
  // (ruling) — goodsWriteOff не хранит собственного итога.
  async goodsWriteOffGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const { amountKopecks, currencyCode } =
      await this.sumVoucherStockValueKopecks(context);

    return this.buildRows(context, document, currencyCode, [
      {
        debitCode: ACCOUNT_CODE.SHORTAGE,
        creditCode: ACCOUNT_CODE.GOODS,
        amountKopecks,
      },
    ]);
  }

  // goodsPosting не хранит итога (объект без total) — сумма собирается из
  // строк stockLedgerEntry так же, как для списания.
  async goodsPostingGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const { amountKopecks, currencyCode } =
      await this.sumVoucherStockValueKopecks(context);

    return this.buildRows(context, document, currencyCode, [
      {
        debitCode: ACCOUNT_CODE.GOODS,
        creditCode: ACCOUNT_CODE.OTHER_INCOME,
        amountKopecks,
      },
    ]);
  }

  // Ручная операция: строки как введены — счета уже ссылками, party/item
  // passthrough; validate провайдера гарантирует заполненность.
  manualEntryGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): ErpGlEntryRow[] {
    return lines.map((line) => {
      const amountKopecks = currencyToKopecks(
        line.amount as CurrencyFieldValue,
      );

      return {
        name: isNonEmptyString(line.name)
          ? line.name
          : typeof document.name === 'string'
            ? document.name
            : '',
        date: context.postingDate,
        debitAccountId: line.debitAccountId as string,
        creditAccountId: line.creditAccountId as string,
        amount: kopecksToCurrency(
          amountKopecks,
          this.resolveCurrencyCode(line.amount as CurrencyFieldValue),
        ),
        organizationId:
          typeof document.organizationId === 'string'
            ? document.organizationId
            : null,
        partyId: typeof line.partyId === 'string' ? line.partyId : null,
        itemId: typeof line.itemId === 'string' ? line.itemId : null,
        voucherType: context.documentObjectName,
        voucherId: context.documentId,
        isCancelled: false,
        isCancellation: false,
      };
    });
  }

  // Закрытие месяца (Task 5, research §3): суммы — не на документе/строках, а
  // считаются здесь из оборотов glEntry за месяц (и, при реформации, за год)
  // — единственный контрибьютор, который сам агрегирует регистр, а не
  // передаёт по документу. «Нет оборотов за месяц» — RU-отказ живёт здесь
  // (не в validate провайдера): он зависит от того же вычисленного оборота,
  // которое нужно посчитать один раз, а не дважды в разных сервисах.
  async monthCloseGlEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<ErpGlEntryRow[]> {
    const organizationId = document.organizationId as string;
    const period = document.period as string;
    const isYearReformation = document.isYearReformation === true;
    const periodEndExclusive = firstDayOfNextMonth(period);

    const monthlyByCode = await this.queryAccountTurnoverByCode(
      context,
      organizationId,
      MONTH_CLOSE_SOURCE_ACCOUNT_CODES,
      period,
      periodEndExclusive,
    );
    const yearlyByCode = isYearReformation
      ? await this.queryAccountTurnoverByCode(
          context,
          organizationId,
          MONTH_CLOSE_SOURCE_ACCOUNT_CODES,
          `${period.slice(0, 4)}-01-01`,
          periodEndExclusive,
        )
      : undefined;

    const { legs, hasMonthlyTurnover } = computeMonthCloseLegs(
      monthlyByCode,
      yearlyByCode,
    );

    if (!hasMonthlyTurnover) {
      throw new ErpPostingException(
        `Month close "${document.id}" has no gl turnover for period ${period}`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        { userFriendlyMessage: msg`Нет оборотов за месяц.` },
      );
    }

    return this.buildRows(context, document, RUB_CURRENCY_CODE, legs);
  }

  // Оборот (Σ дебет отдельно от Σ кредит, без сворачивания) по списку кодов
  // счетов за [dateFromInclusive, dateToExclusive) — тот же UNION ALL приём,
  // что и trial-balance.service.ts's queryLegAggregates, но по явному списку
  // счетов и одному диапазону дат (не opening+turnover), внутри уже открытой
  // транзакции проведения (context.transactionScope), а не отдельной
  // read-only транзакцией отчёта.
  private async queryAccountTurnoverByCode(
    context: PostingContext,
    organizationId: string,
    codes: readonly string[],
    dateFromInclusive: string,
    dateToExclusive: string,
  ): Promise<Map<string, AccountTurnover>> {
    const accounts = await context.transactionScope
      .getRepository<Record<string, unknown>>(
        ACCOUNT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ code: In([...codes]) });

    const codeByAccountId = new Map<string, string>();

    for (const account of accounts) {
      if (typeof account.id === 'string' && typeof account.code === 'string') {
        codeByAccountId.set(account.id, account.code);
      }
    }

    const turnoverByCode = new Map<string, AccountTurnover>();

    if (codeByAccountId.size === 0) {
      return turnoverByCode;
    }

    const glEntryTableReference = this.workspaceTableReference(
      context.workspaceId,
    );
    const accountIds = [...codeByAccountId.keys()];

    const rows = await context.transactionScope.executeRawQuery(
      `WITH legs AS (
         SELECT "debitAccountId" AS account_id, "amountAmountMicros" AS micros, TRUE AS is_debit
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "debitAccountId" = ANY($2::uuid[]) AND "date" >= $3 AND "date" < $4 AND "deletedAt" IS NULL
         UNION ALL
         SELECT "creditAccountId" AS account_id, "amountAmountMicros" AS micros, FALSE AS is_debit
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "creditAccountId" = ANY($2::uuid[]) AND "date" >= $3 AND "date" < $4 AND "deletedAt" IS NULL
       )
       SELECT account_id,
         COALESCE(SUM(CASE WHEN is_debit THEN micros ELSE 0 END), 0) AS debit_micros,
         COALESCE(SUM(CASE WHEN NOT is_debit THEN micros ELSE 0 END), 0) AS credit_micros
       FROM legs GROUP BY account_id`,
      [organizationId, accountIds, dateFromInclusive, dateToExclusive],
    );

    for (const row of rows) {
      const code = codeByAccountId.get(String(row.account_id));

      if (!isDefined(code)) {
        continue;
      }

      turnoverByCode.set(code, {
        debitKopecks: currencyToKopecks({
          amountMicros: row.debit_micros,
        } as CurrencyFieldValue),
        creditKopecks: currencyToKopecks({
          amountMicros: row.credit_micros,
        } as CurrencyFieldValue),
      });
    }

    return turnoverByCode;
  }

  private workspaceTableReference(workspaceId: string): string {
    const { flatObjectMetadataMaps, objectIdByNameSingular } =
      getWorkspaceContext();
    const objectMetadataId = objectIdByNameSingular[GL_ENTRY_OBJECT_NAME];

    if (!isDefined(objectMetadataId)) {
      throw new ErpPostingException(
        `Object "${GL_ENTRY_OBJECT_NAME}" does not exist in workspace "${workspaceId}"`,
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

  private async buildRows(
    context: PostingContext,
    document: ErpDocumentRecord,
    currencyCode: string,
    drafts: GlEntryDraft[],
  ): Promise<ErpGlEntryRow[]> {
    const rows: ErpGlEntryRow[] = [];

    for (const draft of drafts) {
      // Нулевая сумма (например НДС при ставке 0 %/«без НДС») — не проводка.
      if (draft.amountKopecks === 0) {
        continue;
      }

      rows.push({
        name: this.buildRowName(draft.debitCode, draft.creditCode, document),
        date: context.postingDate,
        debitAccountId: await this.findAccountIdByCode(
          context,
          draft.debitCode,
        ),
        creditAccountId: await this.findAccountIdByCode(
          context,
          draft.creditCode,
        ),
        amount: kopecksToCurrency(draft.amountKopecks, currencyCode),
        organizationId:
          typeof document.organizationId === 'string'
            ? document.organizationId
            : null,
        partyId: draft.partyId ?? null,
        itemId: null,
        voucherType: context.documentObjectName,
        voucherId: context.documentId,
        isCancelled: false,
        isCancellation: false,
      });
    }

    return rows;
  }

  private buildRowName(
    debitCode: string,
    creditCode: string,
    document: ErpDocumentRecord,
  ): string {
    const documentName = isNonEmptyString(document.name)
      ? ` — ${document.name}`
      : '';

    return `Дт ${debitCode} Кт ${creditCode}${documentName}`;
  }

  private async findAccountIdByCode(
    context: PostingContext,
    code: string,
  ): Promise<string> {
    const account = await context.transactionScope
      .getRepository<Record<string, unknown>>(
        ACCOUNT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ code });

    if (!isDefined(account) || typeof account.id !== 'string') {
      throw new ErpPostingException(
        `Account with code "${code}" not found in the chart of accounts`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Счёт ${code} не найден в плане счетов`,
        },
      );
    }

    return account.id;
  }

  // party в проводках 60/62 — контрагент документа; как и в partyLedgerEntry,
  // пустое поле документа добирается из связанного счёта.
  private async resolveDocumentPartyId(
    context: PostingContext,
    document: ErpDocumentRecord,
    {
      documentFieldName,
      invoiceObjectName,
      invoiceIdFieldName,
      invoicePartyFieldName,
    }: {
      documentFieldName: string;
      invoiceObjectName: string;
      invoiceIdFieldName: string;
      invoicePartyFieldName: string;
    },
  ): Promise<string | null> {
    const directPartyId = document[documentFieldName];

    if (typeof directPartyId === 'string') {
      return directPartyId;
    }

    const invoiceId = document[invoiceIdFieldName];

    if (typeof invoiceId !== 'string') {
      return null;
    }

    const invoice = await context.transactionScope
      .getRepository<ErpDocumentRecord>(invoiceObjectName, BYPASS_PERMISSIONS)
      .findOneBy({ id: invoiceId });

    const invoicePartyId = invoice?.[invoicePartyFieldName];

    return typeof invoicePartyId === 'string' ? invoicePartyId : null;
  }

  private async sumVoucherStockValueKopecks(context: PostingContext): Promise<{
    amountKopecks: number;
    currencyCode: string;
  }> {
    const ledgerRows = await context.transactionScope
      .getRepository<Record<string, unknown>>(
        STOCK_LEDGER_ENTRY_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({
        voucherType: context.documentObjectName,
        voucherId: context.documentId,
        isCancellation: false,
      });

    let amountKopecks = 0;
    let currencyCode = RUB_CURRENCY_CODE;

    for (const ledgerRow of ledgerRows) {
      const stockValueDiff = ledgerRow.stockValueDiff as CurrencyFieldValue;

      amountKopecks += Math.abs(currencyToKopecks(stockValueDiff));

      const rowCurrencyCode = stockValueDiff?.currencyCode;

      if (isNonEmptyString(rowCurrencyCode)) {
        currencyCode = rowCurrencyCode;
      }
    }

    return { amountKopecks, currencyCode };
  }

  private resolveCurrencyCode(value: CurrencyFieldValue): string {
    const currencyCode = value?.currencyCode;

    return isNonEmptyString(currencyCode) ? currencyCode : RUB_CURRENCY_CODE;
  }
}
