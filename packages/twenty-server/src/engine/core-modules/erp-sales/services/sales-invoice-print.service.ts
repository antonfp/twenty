import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { amountInWordsRu } from 'src/engine/core-modules/erp/utils/amount-in-words-ru.util';
import {
  extractLineBlockTemplate,
  extractNamedBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
  getTemplatePlaceholderNames,
  spliceNamedBlock,
  withUnknownPlaceholdersPreserved,
} from 'src/engine/core-modules/erp/utils/fill-print-template.util';
import { SCHET_TEMPLATE_HTML } from 'src/engine/core-modules/erp-sales/constants/schet-template.constant';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  buildPaymentQrPayload,
  buildPaymentQrPurpose,
} from 'src/engine/core-modules/erp-sales/utils/build-payment-qr-payload.util';
import {
  type ComputedInvoiceLine,
  computeInvoiceTotals,
} from 'src/engine/core-modules/erp-sales/utils/compute-invoice-totals.util';
import {
  currencyToKopecks,
  kopecksToRubles,
  vatRatePercent,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import {
  formatDateRuLong,
  formatDateRuShort,
  formatMoneyRu,
  formatQuantityRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { renderPaymentQrDataUri } from 'src/engine/core-modules/erp-sales/utils/render-payment-qr-image.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

type WorkspaceRecord = Record<string, unknown> & { id: string };

// SELECT values of item.unit / salesInvoiceLine unit → печатная «Ед.».
const UNIT_LABELS: Record<string, string> = {
  PIECE: 'шт',
  SERVICE: 'усл',
  HOUR: 'ч',
  DAY: 'день',
  MONTH: 'мес',
  KILOGRAM: 'кг',
  METER: 'м',
  SQUARE_METER: 'м²',
  SET: 'компл',
};

const asText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

// «наименование, ИНН х, КПП у, адрес» — пустые части и лишние запятые
// опускаются (у ИП нет КПП).
const buildRequisitesLine = (party: WorkspaceRecord | null): string => {
  if (!isDefined(party)) {
    return '';
  }

  const name = isNonEmptyString(asText(party.fullName))
    ? asText(party.fullName)
    : asText(party.name);
  const inn = asText(party.inn);
  const kpp = asText(party.kpp);
  const address = asText(party.legalAddress);

  return [
    name,
    isNonEmptyString(inn) ? `ИНН ${inn}` : '',
    isNonEmptyString(kpp) ? `КПП ${kpp}` : '',
    address,
  ]
    .filter(isNonEmptyString)
    .join(', ');
};

// Placeholder names the built-in template (and this service's fill code)
// supports — get_print_template exposes this list; an active override
// template's own unsupported placeholder is left literal instead of blanked
// (see withUnknownPlaceholdersPreserved), not treated as an error.
export const SALES_INVOICE_PLACEHOLDER_NAMES: ReadonlySet<string> = new Set(
  getTemplatePlaceholderNames(SCHET_TEMPLATE_HTML),
);

@Injectable()
export class SalesInvoicePrintService {
  private readonly logger = new Logger(SalesInvoicePrintService.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly printTemplateService: PrintTemplateService,
  ) {}

  async renderSalesInvoiceHtml(
    workspaceId: string,
    salesInvoiceId: string,
  ): Promise<string> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () => this.loadAndRender(workspaceId, salesInvoiceId),
      buildSystemAuthContext(workspaceId),
    );
  }

  private async loadAndRender(
    workspaceId: string,
    salesInvoiceId: string,
  ): Promise<string> {
    const invoiceRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'salesInvoice',
        BYPASS_PERMISSIONS,
      );
    const invoice = await invoiceRepository.findOneBy({ id: salesInvoiceId });

    if (!isDefined(invoice)) {
      throw new NotFoundException(
        `Sales invoice "${salesInvoiceId}" not found`,
      );
    }

    const lineRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'salesInvoiceLine',
        BYPASS_PERMISSIONS,
      );
    const lines = (await lineRepository.findBy({ salesInvoiceId })).sort(
      (firstLine, secondLine) => {
        return (
          Number(firstLine.position ?? 0) - Number(secondLine.position ?? 0) ||
          asText(firstLine.createdAt).localeCompare(
            asText(secondLine.createdAt),
          )
        );
      },
    );

    const organization = await this.loadOrganization(workspaceId, invoice);
    const customer = await this.loadRelatedRecord(
      workspaceId,
      'company',
      invoice.customerId,
    );
    const itemsById = await this.loadItemsById(workspaceId, lines);

    const activeOverride = await this.printTemplateService.findActiveTemplate(
      workspaceId,
      'SCHET',
    );
    const { html: templateHtml } =
      this.printTemplateService.resolveTemplateHtml(
        activeOverride,
        SCHET_TEMPLATE_HTML,
      );

    return this.render({
      invoice,
      lines,
      organization,
      customer,
      itemsById,
      templateHtml,
    });
  }

  private async loadOrganization(
    workspaceId: string,
    invoice: WorkspaceRecord,
  ): Promise<WorkspaceRecord | null> {
    const organization = await this.loadRelatedRecord(
      workspaceId,
      'organization',
      invoice.organizationId,
    );

    if (isDefined(organization)) {
      return organization;
    }

    // Fallback for invoices without an explicit organization: the default one.
    const organizationRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'organization',
        BYPASS_PERMISSIONS,
      );

    return organizationRepository.findOneBy({ isDefault: true });
  }

  private async loadRelatedRecord(
    workspaceId: string,
    objectNameSingular: string,
    recordId: unknown,
  ): Promise<WorkspaceRecord | null> {
    if (typeof recordId !== 'string') {
      return null;
    }

    const repository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        objectNameSingular,
        BYPASS_PERMISSIONS,
      );

    return repository.findOneBy({ id: recordId });
  }

  private async loadItemsById(
    workspaceId: string,
    lines: WorkspaceRecord[],
  ): Promise<Map<string, WorkspaceRecord>> {
    const itemIds = lines
      .map((line) => line.itemId)
      .filter((itemId): itemId is string => typeof itemId === 'string');

    // The line→item relation is optional in the installed app; skip quietly
    // when there is nothing to resolve or no item object in the workspace.
    if (
      itemIds.length === 0 ||
      !isDefined(getWorkspaceContext().objectIdByNameSingular.item)
    ) {
      return new Map();
    }

    const itemRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'item',
        BYPASS_PERMISSIONS,
      );
    const items = await itemRepository.findBy({ id: In(itemIds) });

    return new Map(items.map((item) => [item.id, item]));
  }

  private async render({
    invoice,
    lines,
    organization,
    customer,
    itemsById,
    templateHtml,
  }: {
    invoice: WorkspaceRecord;
    lines: WorkspaceRecord[];
    organization: WorkspaceRecord | null;
    customer: WorkspaceRecord | null;
    itemsById: Map<string, WorkspaceRecord>;
    templateHtml: string;
  }): Promise<string> {
    // Totals are recomputed from the lines so the print form is correct for
    // drafts too, not only for posted invoices.
    const { computedLines, totalKopecks, vatTotalKopecks } =
      computeInvoiceTotals(lines);

    const { vatRowLabel, vatAmountText } = this.buildVatRow(
      computedLines,
      vatTotalKopecks,
    );

    const invoiceDate =
      asText(invoice.postingDate) ||
      asText(invoice.invoiceDate) ||
      asText(invoice.createdAt) ||
      new Date().toISOString();

    // Task 6 (ruling): исправительный документ, не УКД (research §4) —
    // строка появляется только при revisionNumber>0, дата — invoiceDate ЭТОГО
    // (исправляющего) документа, не оригинала.
    const revisionNumber = Number(invoice.revisionNumber ?? 0);
    const revisionLine =
      revisionNumber > 0
        ? `Исправление № ${revisionNumber} от ${formatDateRuLong(invoiceDate)}`
        : '';

    const invoiceNumberText = isNonEmptyString(asText(invoice.number))
      ? asText(invoice.number)
      : 'б/н';

    const headerValues: Record<string, string> = {
      supplier_bank_name: asText(organization?.bankName),
      supplier_bank_bik: asText(organization?.bik),
      supplier_bank_corr_account: asText(organization?.corrAccount),
      supplier_bank_account: asText(organization?.settlementAccount),
      supplier_inn: asText(organization?.inn),
      supplier_kpp: asText(organization?.kpp),
      supplier_short_name: asText(organization?.name),
      invoice_number: invoiceNumberText,
      invoice_date: formatDateRuLong(invoiceDate),
      revisionLine,
      supplier_requisites: buildRequisitesLine(organization),
      buyer_requisites: buildRequisitesLine(customer),
      total_amount: formatMoneyRu(totalKopecks),
      vat_row_label: vatRowLabel,
      vat_amount: vatAmountText,
      grand_total: formatMoneyRu(totalKopecks),
      items_count: String(lines.length),
      amount_in_words: amountInWordsRu(kopecksToRubles(totalKopecks)),
      director_name: asText(organization?.directorName),
      accountant_name: isNonEmptyString(asText(organization?.accountantName))
        ? asText(organization?.accountantName)
        : asText(organization?.directorName),
    };

    // Task 7 (ruling): статический СБП-QR (ГОСТ Р 56042-2014 / ST00012) —
    // блок в built-in шаблоне пропускается целиком (spliceNamedBlock с '')
    // без полного набора обязательных банковских реквизитов; для кастомных
    // шаблонов те же значения остаются доступны как плоские {{sbpQr}}/
    // {{sbpQrPayload}} (пустая строка вместо пропуска — тот же конвенция,
    // что у остальных «пустые реквизиты выводятся пустыми строками»).
    //
    // Review finding (Major): сплайсить сюда УЖЕ ЗАПОЛНЕННЫЙ блок (как было
    // раньше) означает, что его {{sbpQr}}/{{sbpQrPayload}} проходят через
    // fillPlaceholders дважды — свой локальный проход и общий header-проход
    // ниже — и organization/invoice-текст, случайно похожий на ИЗВЕСТНОЕ имя
    // плейсхолдера (например, «{{invoice_number}}» буквально в названии
    // организации), на втором проходе подменяется чужими данными. Тот самый
    // класс бага, который LINE_BLOCK_SENTINEL в fillPrintTemplate уже
    // закрывает для строк. Фикс — тот же принцип: сюда сплайсится
    // НЕЗАПОЛНЕННЫЙ шаблон блока (плейсхолдеры {{sbpQr}}/{{sbpQrPayload}}
    // остаются как есть), а значения кладутся в общую headerValues-карту —
    // единственный проход fillPlaceholders ниже подставляет их один раз, как
    // и любое другое поле формы.
    const {
      blockTemplate: sbpQrBlockTemplate,
      dataUri: sbpQrDataUri,
      payload: sbpQrPayload,
    } = await this.renderSbpQrBlock({
      templateHtml,
      organization,
      invoiceNumberText,
      invoiceDate,
      totalKopecks,
    });
    const templateWithQr = spliceNamedBlock(
      templateHtml,
      'sbpQr',
      sbpQrBlockTemplate,
    );

    headerValues.sbpQr = sbpQrDataUri;
    headerValues.sbpQrPayload = sbpQrPayload;

    const lineBlockTemplate = extractLineBlockTemplate(templateWithQr);

    const renderedLines = computedLines
      .map(({ line, amountKopecks }, lineIndex) => {
        const item =
          typeof line.itemId === 'string'
            ? itemsById.get(line.itemId)
            : undefined;
        const unitValue = asText(line.unit) || asText(item?.unit);
        const lineValues = {
          row_number: String(lineIndex + 1),
          item_name: asText(line.name) || asText(item?.name),
          quantity: formatQuantityRu(Number(line.quantity ?? 0)),
          unit: UNIT_LABELS[unitValue] ?? unitValue,
          price: formatMoneyRu(
            currencyToKopecks(line.price as CurrencyFieldValue),
          ),
          amount: formatMoneyRu(amountKopecks),
        };

        return fillPlaceholders(
          lineBlockTemplate,
          withUnknownPlaceholdersPreserved(
            lineBlockTemplate,
            lineValues,
            SALES_INVOICE_PLACEHOLDER_NAMES,
          ),
        );
      })
      .join('');

    return fillPrintTemplate({
      template: templateWithQr,
      headerValues: withUnknownPlaceholdersPreserved(
        templateWithQr,
        headerValues,
        SALES_INVOICE_PLACEHOLDER_NAMES,
      ),
      renderedLinesHtml: renderedLines,
    });
  }

  // Returns the RAW (still-{{sbpQr}}/{{sbpQrPayload}}-shaped) block template
  // to splice into the built-in template in place of its own
  // <!-- BEGIN sbpQr -->…<!-- END sbpQr --> marker — '' when the organization
  // lacks the required requisites (buildPaymentQrPayload returns null) or
  // when the active template has no such marker at all (a custom override
  // that only wants the flat placeholders, filled by the caller instead).
  // Deliberately NOT pre-filled here (see the Major review finding this
  // fixed): the caller splices this template text in BEFORE render()'s one
  // shared fillPlaceholders pass, so {{sbpQr}}/{{sbpQrPayload}} inside it get
  // substituted exactly once, from the same headerValues map as every other
  // field — no second pass to re-scan already-substituted text.
  private async renderSbpQrBlock({
    templateHtml,
    organization,
    invoiceNumberText,
    invoiceDate,
    totalKopecks,
  }: {
    templateHtml: string;
    organization: WorkspaceRecord | null;
    invoiceNumberText: string;
    invoiceDate: string;
    totalKopecks: number;
  }): Promise<{ blockTemplate: string; dataUri: string; payload: string }> {
    const purpose = buildPaymentQrPurpose(
      invoiceNumberText,
      formatDateRuShort(invoiceDate),
    );
    const payload = buildPaymentQrPayload(
      {
        name: asText(organization?.name),
        settlementAccount: asText(organization?.settlementAccount),
        bankName: asText(organization?.bankName),
        bik: asText(organization?.bik),
        corrAccount: asText(organization?.corrAccount),
        inn: asText(organization?.inn),
        kpp: asText(organization?.kpp),
      },
      purpose,
      totalKopecks,
    );

    if (!isDefined(payload)) {
      return { blockTemplate: '', dataUri: '', payload: '' };
    }

    const dataUri = await this.safeRenderQrDataUri(payload);

    if (!isNonEmptyString(dataUri)) {
      return { blockTemplate: '', dataUri: '', payload };
    }

    const blockTemplate = extractNamedBlockTemplate(templateHtml, 'sbpQr');

    // No marker in the active template (custom override without one) —
    // nothing to splice, but dataUri/payload still feed the flat headerValues
    // entries below for a template that references {{sbpQr}} directly.
    return { blockTemplate: blockTemplate ?? '', dataUri, payload };
  }

  // QR — необязательное дополнение к печатной форме; сбой рендера (например,
  // payload сверх ёмкости QR — крайне маловероятно для этих длин полей, но
  // не невозможно) не должен ронять печать счёта целиком.
  private async safeRenderQrDataUri(payload: string): Promise<string> {
    try {
      return await renderPaymentQrDataUri(payload);
    } catch (error) {
      this.logger.error('sbpQr: QR render failed, printing without it', error);

      return '';
    }
  }

  private buildVatRow(
    computedLines: ComputedInvoiceLine[],
    vatTotalKopecks: number,
  ): { vatRowLabel: string; vatAmountText: string } {
    if (vatTotalKopecks === 0) {
      return { vatRowLabel: 'Без налога (НДС):', vatAmountText: '—' };
    }

    const vatBearingRates = new Set(
      computedLines
        .filter((computedLine) => computedLine.vatKopecks > 0)
        .map((computedLine) => computedLine.vatRate),
    );

    // MVP: одна ставка на документ; при смешанных ставках метка без процента.
    const vatRowLabel =
      vatBearingRates.size === 1
        ? `В том числе НДС (${vatRatePercent([...vatBearingRates][0])}%):`
        : 'В том числе НДС:';

    return { vatRowLabel, vatAmountText: formatMoneyRu(vatTotalKopecks) };
  }
}
