import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import { currencyToKopecks } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import {
  formatDateRuShort,
  formatQuantityRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  buildKudirEntries,
  type KudirEntry,
  type KudirRawEntry,
  matchGoodsExpenseLine,
} from 'src/engine/core-modules/erp-accounting/utils/compute-kudir.util';
import { renderKudirHtml } from 'src/engine/core-modules/erp-accounting/utils/render-kudir-html.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
const ORGANIZATION_OBJECT_NAME = 'organization';
const COMPANY_OBJECT_NAME = 'company';
const PAYMENT_OBJECT_NAME = 'payment';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SUPPLIER_PAYMENT_OBJECT_NAME = 'supplierPayment';
const SUPPLIER_INVOICE_OBJECT_NAME = 'supplierInvoice';
const SUPPLIER_INVOICE_LINE_OBJECT_NAME = 'supplierInvoiceLine';
const GOODS_RECEIPT_OBJECT_NAME = 'goodsReceipt';
const GOODS_RECEIPT_LINE_OBJECT_NAME = 'goodsReceiptLine';
const SALES_SHIPMENT_OBJECT_NAME = 'salesShipment';
const SALES_SHIPMENT_LINE_OBJECT_NAME = 'salesShipmentLine';
const ITEM_OBJECT_NAME = 'item';

const TAX_SYSTEM_USN_INCOME = 'USN_INCOME';
const TAX_SYSTEM_USN_INCOME_EXPENSE = 'USN_INCOME_EXPENSE';
const PAYMENT_STATUS_PAID = 'PAID';

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const asNumber = (value: unknown): number => Number(value ?? 0);

const uniqueStrings = (values: unknown[]): string[] => [
  ...new Set(
    values.filter((value): value is string => isNonEmptyString(value)),
  ),
];

export type KudirData = {
  organizationName: string;
  organizationInn: string;
  taxSystemLabel: string;
  year: number;
  entries: KudirEntry[];
  totalIncomeKopecks: number;
  totalExpenseKopecks: number;
};

// КУДиР раздел I (research §2 / ruling «КУДиР»): кассовый метод, НЕ витрина
// над glEntry — доходы/расходы строятся напрямую из POSTED payment/
// supplierPayment (+ для товаров, тройное условие ст. 346.17 НК РФ через
// goodsReceipt/salesShipment). Только для организаций на УСН — гейт ниже.
@Injectable()
export class KudirService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getKudirData(
    workspaceId: string,
    organizationId: string,
    year: number,
  ): Promise<KudirData> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          (transactionScope) =>
            this.loadAndCompute(organizationId, year, transactionScope),
        ),
      buildSystemAuthContext(workspaceId),
    );
  }

  async renderHtml(
    workspaceId: string,
    organizationId: string,
    year: number,
  ): Promise<string> {
    const data = await this.getKudirData(workspaceId, organizationId, year);

    return renderKudirHtml(data);
  }

  private async loadAndCompute(
    organizationId: string,
    year: number,
    scope: WorkspaceTransactionScope,
  ): Promise<KudirData> {
    const organization = await scope
      .getRepository<ErpDocumentRecord>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      throw new NotFoundException(`Организация "${organizationId}" не найдена`);
    }

    const taxSystem = asString(organization.taxSystem);

    if (
      taxSystem !== TAX_SYSTEM_USN_INCOME &&
      taxSystem !== TAX_SYSTEM_USN_INCOME_EXPENSE
    ) {
      throw new BadRequestException(
        'КУДиР ведётся только для организаций на УСН (объект налогообложения «доходы» или «доходы минус расходы») — у выбранной организации иная (или не заполненная) система налогообложения.',
      );
    }

    const isIncomeExpense = taxSystem === TAX_SYSTEM_USN_INCOME_EXPENSE;
    const dateFrom = `${year}-01-01`;
    const dateTo = `${year}-12-31`;

    const incomeRaw = await this.buildIncomeEntries(
      scope,
      organizationId,
      dateFrom,
      dateTo,
    );
    // «Доходы»: заполняется только графа доходов — расходные источники не
    // читаются вовсе для этого СНО (research §2).
    const expenseRaw = isIncomeExpense
      ? [
          ...(await this.buildServiceExpenseEntries(
            scope,
            organizationId,
            dateFrom,
            dateTo,
          )),
          ...(await this.buildGoodsExpenseEntries(
            scope,
            organizationId,
            dateFrom,
            dateTo,
          )),
        ]
      : [];

    const { entries, totalIncomeKopecks, totalExpenseKopecks } =
      buildKudirEntries([...incomeRaw, ...expenseRaw]);

    const organizationName =
      typeof organization.fullName === 'string' &&
      organization.fullName.length > 0
        ? organization.fullName
        : typeof organization.name === 'string'
          ? organization.name
          : '';

    return {
      organizationName,
      organizationInn: asString(organization.inn) ?? '',
      taxSystemLabel: isIncomeExpense
        ? 'Доходы, уменьшенные на величину расходов'
        : 'Доходы',
      year,
      entries,
      totalIncomeKopecks,
      totalExpenseKopecks,
    };
  }

  private isDateInRange(
    date: unknown,
    dateFrom: string,
    dateTo: string,
  ): date is string {
    return typeof date === 'string' && date >= dateFrom && date <= dateTo;
  }

  // PostingService.postInTransaction only ever WRITES docStatus/postedAt on
  // POST (posting.service.ts) — it never backfills the document's own
  // postingDate column when the caller left it unset at creation (the common
  // case: e2e_accounting.ts/e2e_purchases.ts create documents with only
  // paymentDate/invoiceDate, no explicit postingDate). GL entries still get
  // dated correctly because PostingService computes a postingContext.
  // postingDate fallback (document.postingDate ?? document.docDate ?? "now")
  // for THAT purpose only. КУДиР reads the document itself, not glEntry, so
  // it needs the same fallback — postedAt (DATE_TIME, always set at POST,
  // written in the same request/millisecond as that "now" fallback) is the
  // closest available proxy when postingDate itself is null.
  private resolveDocumentDate(document: ErpDocumentRecord): string | null {
    return (
      this.toDateOnly(document.postingDate) ??
      this.toDateOnly(document.postedAt)
    );
  }

  // The workspace-ORM repository layer (twenty-orm/entity-manager) hydrates
  // DATE_TIME columns as native `Date` instances (see
  // workspace-entity-manager.ts's own `instanceof Date` branches) — unlike
  // the GraphQL resolver layer, which always serializes to an ISO string.
  // DATE columns are documented elsewhere (period-lock.service.ts) to come
  // back as plain 'YYYY-MM-DD' strings on THIS layer too, but handling both
  // shapes here costs nothing and avoids depending on that being true for
  // every column/path.
  private toDateOnly(value: unknown): string | null {
    if (typeof value === 'string' && value.length >= 10) {
      return value.slice(0, 10);
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return null;
  }

  // Общий вид доходной/несложной расходной строки: «{prefix} № {invoice.number}
  // от {invoice.invoiceDate}, {counterpartyName}», с запасным текстом когда
  // платёж не привязан ни к какому счёту.
  private buildContent(
    withInvoiceLabel: string,
    noInvoiceLabel: string,
    invoice: ErpDocumentRecord | undefined,
    counterpartyName: string | null,
  ): string {
    const parts: string[] = [];

    if (isDefined(invoice)) {
      const invoiceNumber = asString(invoice.number) ?? 'б/н';
      const invoiceDate = asString(invoice.invoiceDate);

      parts.push(
        `${withInvoiceLabel} № ${invoiceNumber}${
          isDefined(invoiceDate) ? ` от ${formatDateRuShort(invoiceDate)}` : ''
        }`,
      );
    } else {
      parts.push(noInvoiceLabel);
    }

    if (isNonEmptyString(counterpartyName)) {
      parts.push(counterpartyName);
    }

    return parts.join(', ');
  }

  private async loadCompaniesByIds(
    scope: WorkspaceTransactionScope,
    ids: string[],
  ): Promise<Map<string, ErpDocumentRecord>> {
    if (ids.length === 0) {
      return new Map();
    }

    const companies = await scope
      .getRepository<ErpDocumentRecord>(COMPANY_OBJECT_NAME, BYPASS_PERMISSIONS)
      .findBy({ id: In(ids) });

    return new Map(companies.map((company) => [company.id, company]));
  }

  // Доходы (кассовый метод, оба СНО): каждый POSTED payment — строка дохода
  // на дату postingDate (НЕ дата счёта) — ruling «доход по дате ОПЛАТЫ, не
  // счёта».
  private async buildIncomeEntries(
    scope: WorkspaceTransactionScope,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KudirRawEntry[]> {
    const payments = await scope
      .getRepository<ErpDocumentRecord>(PAYMENT_OBJECT_NAME, BYPASS_PERMISSIONS)
      .findBy({ organizationId, docStatus: DOC_STATUS.POSTED });
    const inYear = payments.filter((payment) =>
      this.isDateInRange(this.resolveDocumentDate(payment), dateFrom, dateTo),
    );

    if (inYear.length === 0) {
      return [];
    }

    const invoiceIds = uniqueStrings(
      inYear.map((payment) => payment.salesInvoiceId),
    );
    const invoices =
      invoiceIds.length > 0
        ? await scope
            .getRepository<ErpDocumentRecord>(
              SALES_INVOICE_OBJECT_NAME,
              BYPASS_PERMISSIONS,
            )
            .findBy({ id: In(invoiceIds) })
        : [];
    const invoicesById = new Map(
      invoices.map((invoice) => [invoice.id, invoice]),
    );

    const companyIds = uniqueStrings([
      ...inYear.map((payment) => payment.payerId),
      ...invoices.map((invoice) => invoice.customerId),
    ]);
    const companiesById = await this.loadCompaniesByIds(scope, companyIds);

    return inYear.map((payment) => {
      const invoice = isDefined(payment.salesInvoiceId)
        ? invoicesById.get(String(payment.salesInvoiceId))
        : undefined;
      const counterpartyId =
        asString(payment.payerId) ??
        (isDefined(invoice) ? asString(invoice.customerId) : null);
      const counterpartyName = isDefined(counterpartyId)
        ? asString(companiesById.get(counterpartyId)?.name)
        : null;
      const postingDate = this.resolveDocumentDate(payment) as string;

      return {
        date: postingDate,
        documentLabel: `Поступление оплаты № ${asString(payment.number) ?? 'б/н'} от ${formatDateRuShort(postingDate)}`,
        content: this.buildContent(
          'Оплата по счёту',
          'Поступление оплаты',
          invoice,
          counterpartyName,
        ),
        incomeKopecks: currencyToKopecks(payment.amount as CurrencyFieldValue),
        expenseKopecks: 0,
      };
    });
  }

  // Расходы, услуги/прочее (только УСН доходы-расходы): каждый POSTED
  // supplierPayment на счёт БЕЗ товарных строк — строка расхода на дату
  // оплаты. Счета с товарными строками маршрутизируются через
  // buildGoodsExpenseEntries (тройное условие), их оплаты сюда НЕ попадают —
  // иначе один и тот же товар был бы учтён дважды.
  private async buildServiceExpenseEntries(
    scope: WorkspaceTransactionScope,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KudirRawEntry[]> {
    const payments = await scope
      .getRepository<ErpDocumentRecord>(
        SUPPLIER_PAYMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ organizationId, docStatus: DOC_STATUS.POSTED });
    const inYear = payments.filter((payment) =>
      this.isDateInRange(this.resolveDocumentDate(payment), dateFrom, dateTo),
    );

    if (inYear.length === 0) {
      return [];
    }

    const invoiceIds = uniqueStrings(
      inYear.map((payment) => payment.supplierInvoiceId),
    );
    const invoices =
      invoiceIds.length > 0
        ? await scope
            .getRepository<ErpDocumentRecord>(
              SUPPLIER_INVOICE_OBJECT_NAME,
              BYPASS_PERMISSIONS,
            )
            .findBy({ id: In(invoiceIds) })
        : [];
    const invoicesById = new Map(
      invoices.map((invoice) => [invoice.id, invoice]),
    );
    const itemInvoiceIds =
      invoiceIds.length > 0
        ? await this.findInvoiceIdsWithItemLines(scope, invoiceIds)
        : new Set<string>();

    const companyIds = uniqueStrings([
      ...inYear.map((payment) => payment.supplierId),
      ...invoices.map((invoice) => invoice.supplierId),
    ]);
    const companiesById = await this.loadCompaniesByIds(scope, companyIds);

    const entries: KudirRawEntry[] = [];

    for (const payment of inYear) {
      const invoice = isDefined(payment.supplierInvoiceId)
        ? invoicesById.get(String(payment.supplierInvoiceId))
        : undefined;

      if (isDefined(invoice) && itemInvoiceIds.has(invoice.id)) {
        continue;
      }

      const counterpartyId =
        asString(payment.supplierId) ??
        (isDefined(invoice) ? asString(invoice.supplierId) : null);
      const counterpartyName = isDefined(counterpartyId)
        ? asString(companiesById.get(counterpartyId)?.name)
        : null;
      const postingDate = this.resolveDocumentDate(payment) as string;

      entries.push({
        date: postingDate,
        documentLabel: `Оплата поставщику № ${asString(payment.number) ?? 'б/н'} от ${formatDateRuShort(postingDate)}`,
        content: this.buildContent(
          'Оплата по счёту поставщика',
          'Оплата поставщику',
          invoice,
          counterpartyName,
        ),
        incomeKopecks: 0,
        expenseKopecks: currencyToKopecks(payment.amount as CurrencyFieldValue),
      });
    }

    return entries;
  }

  private async findInvoiceIdsWithItemLines(
    scope: WorkspaceTransactionScope,
    invoiceIds: string[],
  ): Promise<Set<string>> {
    const lines = await scope
      .getRepository<ErpDocumentLineRecord>(
        SUPPLIER_INVOICE_LINE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ supplierInvoiceId: In(invoiceIds) });
    const ids = new Set<string>();

    for (const line of lines) {
      if (isDefined(line.itemId)) {
        ids.add(String(line.supplierInvoiceId));
      }
    }

    return ids;
  }

  // Товарные расходы (только УСН доходы-расходы), тройное условие ст.
  // 346.17 НК РФ: оприходован + оплачен поставщику + реализован. MVP:
  // «оплачен» гейтится по счёту ЦЕЛИКОМ (paymentStatus=PAID, а не по строке —
  // частичная оплата многострочного счёта не распределяется по строкам);
  // «реализован» — по данным erp-stock (salesShipment) БЕЗ партионного
  // сопоставления, см. matchGoodsExpenseLine и kudir-spec.md.
  private async buildGoodsExpenseEntries(
    scope: WorkspaceTransactionScope,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KudirRawEntry[]> {
    const invoices = await scope
      .getRepository<ErpDocumentRecord>(
        SUPPLIER_INVOICE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({
        organizationId,
        docStatus: DOC_STATUS.POSTED,
        paymentStatus: PAYMENT_STATUS_PAID,
      });

    if (invoices.length === 0) {
      return [];
    }

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const invoicesById = new Map(
      invoices.map((invoice) => [invoice.id, invoice]),
    );

    const allLines = await scope
      .getRepository<ErpDocumentLineRecord>(
        SUPPLIER_INVOICE_LINE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ supplierInvoiceId: In(invoiceIds) });
    const itemLines = allLines.filter((line) => isDefined(line.itemId));

    if (itemLines.length === 0) {
      return [];
    }

    // «Оплачен поставщику»: дата последнего POSTED платежа по счёту.
    const payments = await scope
      .getRepository<ErpDocumentRecord>(
        SUPPLIER_PAYMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({
        organizationId,
        docStatus: DOC_STATUS.POSTED,
        supplierInvoiceId: In(invoiceIds),
      });
    const paidDateByInvoiceId = new Map<string, string>();

    for (const payment of payments) {
      const invoiceId = asString(payment.supplierInvoiceId);
      const date = this.resolveDocumentDate(payment);

      if (!isDefined(invoiceId) || !isDefined(date)) {
        continue;
      }

      const current = paidDateByInvoiceId.get(invoiceId);

      if (!isDefined(current) || date > current) {
        paidDateByInvoiceId.set(invoiceId, date);
      }
    }

    // «Оприходован»: POSTED-поступления, привязанные к ЭТОМУ счёту.
    const receipts = await scope
      .getRepository<ErpDocumentRecord>(
        GOODS_RECEIPT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({
        supplierInvoiceId: In(invoiceIds),
        docStatus: DOC_STATUS.POSTED,
      });
    const receiptsById = new Map(
      receipts.map((receipt) => [receipt.id, receipt]),
    );
    const receiptLines =
      receipts.length > 0
        ? await scope
            .getRepository<ErpDocumentLineRecord>(
              GOODS_RECEIPT_LINE_OBJECT_NAME,
              BYPASS_PERMISSIONS,
            )
            .findBy({
              goodsReceiptId: In(receipts.map((receipt) => receipt.id)),
            })
        : [];
    const receivedByInvoiceItem = new Map<
      string,
      { qtyReceived: number; latestDate: string | null }
    >();

    for (const line of receiptLines) {
      const receipt = receiptsById.get(String(line.goodsReceiptId));

      if (!isDefined(receipt)) {
        continue;
      }

      const invoiceId = asString(receipt.supplierInvoiceId);
      const itemId = asString(line.itemId);

      if (!isDefined(invoiceId) || !isDefined(itemId)) {
        continue;
      }

      const key = `${invoiceId}:${itemId}`;
      const entry = receivedByInvoiceItem.get(key) ?? {
        qtyReceived: 0,
        latestDate: null,
      };
      const receiptDate = this.resolveDocumentDate(receipt);

      entry.qtyReceived += asNumber(line.quantity);

      if (
        isDefined(receiptDate) &&
        (!isDefined(entry.latestDate) || receiptDate > entry.latestDate)
      ) {
        entry.latestDate = receiptDate;
      }

      receivedByInvoiceItem.set(key, entry);
    }

    // «Реализован»: хронология POSTED-реализаций каждого товара по всей
    // организации (не только по этому счёту — MVP, без партионного
    // сопоставления, см. класс header comment).
    const itemIds = uniqueStrings(itemLines.map((line) => line.itemId));
    const shipments = await scope
      .getRepository<ErpDocumentRecord>(
        SALES_SHIPMENT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ organizationId, docStatus: DOC_STATUS.POSTED });
    const shipmentsById = new Map(
      shipments.map((shipment) => [shipment.id, shipment]),
    );
    const shipmentLines =
      shipments.length > 0 && itemIds.length > 0
        ? await scope
            .getRepository<ErpDocumentLineRecord>(
              SALES_SHIPMENT_LINE_OBJECT_NAME,
              BYPASS_PERMISSIONS,
            )
            .findBy({
              salesShipmentId: In(shipments.map((shipment) => shipment.id)),
              itemId: In(itemIds),
            })
        : [];
    const soldEventsByItem = new Map<
      string,
      { date: string; quantity: number }[]
    >();

    for (const line of shipmentLines) {
      const shipment = shipmentsById.get(String(line.salesShipmentId));
      const date = isDefined(shipment)
        ? this.resolveDocumentDate(shipment)
        : null;
      const itemId = asString(line.itemId);

      if (!isDefined(date) || !isDefined(itemId)) {
        continue;
      }

      const list = soldEventsByItem.get(itemId) ?? [];

      list.push({ date, quantity: asNumber(line.quantity) });
      soldEventsByItem.set(itemId, list);
    }

    const items =
      itemIds.length > 0
        ? await scope
            .getRepository<ErpDocumentRecord>(
              ITEM_OBJECT_NAME,
              BYPASS_PERMISSIONS,
            )
            .findBy({
              id: In(itemIds),
            })
        : [];
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const supplierIds = uniqueStrings(
      invoices.map((invoice) => invoice.supplierId),
    );
    const companiesById = await this.loadCompaniesByIds(scope, supplierIds);

    const entries: KudirRawEntry[] = [];

    for (const line of itemLines) {
      const invoiceId = asString(line.supplierInvoiceId);
      const itemId = asString(line.itemId);

      if (!isDefined(invoiceId) || !isDefined(itemId)) {
        continue;
      }

      const invoice = invoicesById.get(invoiceId);

      if (!isDefined(invoice)) {
        continue;
      }

      const quantity = asNumber(line.quantity);
      const received = receivedByInvoiceItem.get(`${invoiceId}:${itemId}`);
      const match = matchGoodsExpenseLine({
        quantity,
        amountKopecks: currencyToKopecks(line.amount as CurrencyFieldValue),
        paidDate: paidDateByInvoiceId.get(invoiceId) ?? null,
        receivedQtyAvailable: received?.qtyReceived ?? 0,
        receivedDate: received?.latestDate ?? null,
        soldEvents: soldEventsByItem.get(itemId) ?? [],
      });

      if (
        !isDefined(match) ||
        !this.isDateInRange(match.recognitionDate, dateFrom, dateTo)
      ) {
        continue;
      }

      const itemName = asString(itemsById.get(itemId)?.name) ?? 'номенклатура';
      const supplierName = asString(
        companiesById.get(asString(invoice.supplierId) ?? '')?.name,
      );
      const invoiceNumber = asString(invoice.number) ?? 'б/н';
      const invoiceDate = asString(invoice.invoiceDate);

      entries.push({
        date: match.recognitionDate,
        documentLabel: `Счёт поставщика № ${invoiceNumber}${
          isDefined(invoiceDate) ? ` от ${formatDateRuShort(invoiceDate)}` : ''
        }`,
        content: `Списание в расходы товара «${itemName}» (${formatQuantityRu(quantity)}), поставщик${
          isNonEmptyString(supplierName) ? ` ${supplierName}` : ''
        }`,
        incomeKopecks: 0,
        expenseKopecks: match.amountKopecks,
      });
    }

    return entries;
  }
}
