import { Injectable, NotFoundException } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { amountInWordsRu } from 'src/engine/core-modules/erp/utils/amount-in-words-ru.util';
import {
  type ComputedInvoiceLine,
  computeInvoiceTotals,
} from 'src/engine/core-modules/erp-sales/utils/compute-invoice-totals.util';
import { kopecksToRubles } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import {
  formatDateRuLong,
  formatDateRuShort,
  formatMoneyRu,
  formatQuantityRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { UPD_TEMPLATE_HTML } from 'src/engine/core-modules/erp-stock/constants/upd-template.constant';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

type WorkspaceRecord = Record<string, unknown> & { id: string };

// Статус УПД (письмо ФНС ММВ-20-3/96@): «1» — СЧФ + передаточный документ,
// «2» — только передаточный документ.
export type UpdStatus = '1' | '2';

// Прочерк по правилам формы счёта-фактуры / УПД.
const DASH = '—';

// SELECT-значения item.unit → код ОКЕИ (графа 2) и обозначение (графа 2а);
// услуги кода ОКЕИ не имеют — прочерк.
const UNIT_OKEI: Record<string, { code: string; label: string }> = {
  PIECE: { code: '796', label: 'шт' },
  SERVICE: { code: DASH, label: DASH },
  HOUR: { code: '356', label: 'ч' },
  DAY: { code: '359', label: 'сут' },
  MONTH: { code: '362', label: 'мес' },
  KILOGRAM: { code: '166', label: 'кг' },
  METER: { code: '006', label: 'м' },
  SQUARE_METER: { code: '055', label: 'м²' },
  SET: { code: '839', label: 'компл' },
};

const VAT_RATE_LABEL: Record<string, string> = {
  VAT_20: '20%',
  VAT_10: '10%',
  VAT_0: '0%',
  NO_VAT: 'Без НДС',
};

const LINE_BLOCK_PATTERN = /<!-- BEGIN line -->([\s\S]*?)<!-- END line -->/;

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const asText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

// Blank requisites must render as empty strings, never as 'undefined'.
const fillPlaceholders = (
  template: string,
  values: Record<string, string>,
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, placeholderName) =>
    escapeHtml(values[placeholderName] ?? ''),
  );
};

const orDash = (value: string): string => {
  return isNonEmptyString(value) ? value : DASH;
};

// «ИНН/КПП» одной строкой; у ИП КПП нет — печатаем только ИНН.
const buildInnKpp = (party: WorkspaceRecord | null): string => {
  const inn = asText(party?.inn);
  const kpp = asText(party?.kpp);

  if (!isNonEmptyString(inn)) {
    return DASH;
  }

  return isNonEmptyString(kpp) ? `${inn}/${kpp}` : inn;
};

// Строки [14]/[19]: «наименование, ИНН х» — составитель документа.
const buildComposerLine = (party: WorkspaceRecord | null): string => {
  if (!isDefined(party)) {
    return DASH;
  }

  const name = asText(party.name);
  const inn = asText(party.inn);

  return orDash(
    [name, isNonEmptyString(inn) ? `ИНН ${inn}` : '']
      .filter(isNonEmptyString)
      .join(', '),
  );
};

@Injectable()
export class SalesShipmentPrintService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async renderSalesShipmentUpdHtml(
    workspaceId: string,
    salesShipmentId: string,
    status: UpdStatus,
  ): Promise<string> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () => this.loadAndRender(workspaceId, salesShipmentId, status),
      buildSystemAuthContext(workspaceId),
    );
  }

  private async loadAndRender(
    workspaceId: string,
    salesShipmentId: string,
    status: UpdStatus,
  ): Promise<string> {
    const shipmentRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'salesShipment',
        BYPASS_PERMISSIONS,
      );
    const shipment = await shipmentRepository.findOneBy({
      id: salesShipmentId,
    });

    if (!isDefined(shipment)) {
      throw new NotFoundException(
        `Sales shipment "${salesShipmentId}" not found`,
      );
    }

    const lineRepository =
      await this.globalWorkspaceOrmManager.getRepository<WorkspaceRecord>(
        workspaceId,
        'salesShipmentLine',
        BYPASS_PERMISSIONS,
      );
    // Строка реализации не имеет поля position — стабильный порядок по
    // времени создания.
    const lines = (await lineRepository.findBy({ salesShipmentId })).sort(
      (firstLine, secondLine) =>
        asText(firstLine.createdAt).localeCompare(asText(secondLine.createdAt)),
    );

    const organization = await this.loadOrganization(workspaceId, shipment);
    const customer = await this.loadRelatedRecord(
      workspaceId,
      'company',
      shipment.customerId,
    );
    const itemsById = await this.loadItemsById(workspaceId, lines);

    return this.render({
      shipment,
      lines,
      organization,
      customer,
      itemsById,
      status,
    });
  }

  private async loadOrganization(
    workspaceId: string,
    shipment: WorkspaceRecord,
  ): Promise<WorkspaceRecord | null> {
    const organization = await this.loadRelatedRecord(
      workspaceId,
      'organization',
      shipment.organizationId,
    );

    if (isDefined(organization)) {
      return organization;
    }

    // Fallback for shipments without an explicit organization: the default one.
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

  private render({
    shipment,
    lines,
    organization,
    customer,
    itemsById,
    status,
  }: {
    shipment: WorkspaceRecord;
    lines: WorkspaceRecord[];
    organization: WorkspaceRecord | null;
    customer: WorkspaceRecord | null;
    itemsById: Map<string, WorkspaceRecord>;
    status: UpdStatus;
  }): string {
    // Totals are recomputed from the lines so the print form is correct for
    // drafts too, not only for posted shipments.
    const { computedLines, totalKopecks, vatTotalKopecks } =
      computeInvoiceTotals(lines);
    const netTotalKopecks = totalKopecks - vatTotalKopecks;

    const documentDate =
      asText(shipment.postingDate) ||
      asText(shipment.createdAt) ||
      new Date().toISOString();
    const documentNumber = isNonEmptyString(asText(shipment.number))
      ? asText(shipment.number)
      : 'б/н';

    const directorName = asText(organization?.directorName);
    const sellerName = isNonEmptyString(asText(organization?.fullName))
      ? asText(organization?.fullName)
      : asText(organization?.name);

    const headerValues: Record<string, string> = {
      status,
      document_number: documentNumber,
      document_date: formatDateRuLong(documentDate),
      seller_name: orDash(sellerName),
      seller_address: orDash(asText(organization?.legalAddress)),
      seller_inn_kpp: buildInnKpp(organization),
      consignor: DASH,
      consignee: DASH,
      payment_document: DASH,
      shipping_document_info: this.buildShippingDocumentInfo(
        lines.length,
        documentNumber,
        documentDate,
      ),
      advance_invoice_info: DASH,
      buyer_name: orDash(asText(customer?.name)),
      buyer_address: orDash(asText(customer?.legalAddress)),
      buyer_inn_kpp: buildInnKpp(customer),
      currency_info: 'Российский рубль, 643',
      gov_contract_id: DASH,
      total_net: formatMoneyRu(netTotalKopecks),
      total_vat: this.buildVatTotalText(computedLines, vatTotalKopecks, status),
      total_gross: formatMoneyRu(totalKopecks),
      items_count: String(lines.length),
      amount_in_words: amountInWordsRu(kopecksToRubles(totalKopecks)),
      director_name: directorName,
      accountant_name: isNonEmptyString(asText(organization?.accountantName))
        ? asText(organization?.accountantName)
        : directorName,
      transfer_basis: DASH,
      transport_info: DASH,
      transferred_by_name: directorName,
      shipping_date: formatDateRuShort(documentDate),
      seller_responsible_name: directorName,
      seller_composer: buildComposerLine(organization),
      buyer_composer: buildComposerLine(customer),
    };

    const lineBlockMatch = UPD_TEMPLATE_HTML.match(LINE_BLOCK_PATTERN);
    const lineBlockTemplate = lineBlockMatch?.[1] ?? '';

    const renderedLines = computedLines
      .map((computedLine, lineIndex) =>
        fillPlaceholders(
          lineBlockTemplate,
          this.buildLineValues(computedLine, lineIndex, itemsById, status),
        ),
      )
      .join('');

    return fillPlaceholders(
      UPD_TEMPLATE_HTML.replace(LINE_BLOCK_PATTERN, () => renderedLines),
      headerValues,
    );
  }

  // Строка 5а: для УПД — реквизиты самого документа (позиция ФНС,
  // письмо от 17.06.2021 № ЗГ-3-3/4368@).
  private buildShippingDocumentInfo(
    linesCount: number,
    documentNumber: string,
    documentDate: string,
  ): string {
    if (linesCount === 0) {
      return DASH;
    }

    const rangeText = linesCount > 1 ? `1–${linesCount}` : '1';

    return `№ п/п ${rangeText} № ${documentNumber} от ${formatDateRuShort(documentDate)}`;
  }

  private buildLineValues(
    { line, amountKopecks, vatKopecks, vatRate }: ComputedInvoiceLine,
    lineIndex: number,
    itemsById: Map<string, WorkspaceRecord>,
    status: UpdStatus,
  ): Record<string, string> {
    const item =
      typeof line.itemId === 'string' ? itemsById.get(line.itemId) : undefined;
    const unit = UNIT_OKEI[asText(item?.unit)] ?? { code: DASH, label: DASH };
    const quantity = Number(line.quantity ?? 0);
    const netKopecks = amountKopecks - vatKopecks;
    const priceNetKopecks =
      quantity > 0 ? Math.round(netKopecks / quantity) : netKopecks;

    // Статус «2» — только передаточный документ: показатели «исключительно
    // счёта-фактуры» прочеркиваются (письмо ФНС ММВ-20-3/96@).
    const isTransferOnly = status === '2';

    return {
      row_number: String(lineIndex + 1),
      item_code: orDash(asText(item?.sku)),
      item_name: asText(line.name) || asText(item?.name),
      unit_code: unit.code,
      unit_label: unit.label,
      quantity: formatQuantityRu(quantity),
      price: formatMoneyRu(priceNetKopecks),
      amount_net: formatMoneyRu(netKopecks),
      excise: isTransferOnly ? DASH : 'без акциза',
      vat_rate: isTransferOnly ? DASH : (VAT_RATE_LABEL[vatRate ?? ''] ?? DASH),
      vat_amount: isTransferOnly
        ? DASH
        : vatRate === 'NO_VAT'
          ? 'Без НДС'
          : formatMoneyRu(vatKopecks),
      amount_gross: formatMoneyRu(amountKopecks),
    };
  }

  private buildVatTotalText(
    computedLines: ComputedInvoiceLine[],
    vatTotalKopecks: number,
    status: UpdStatus,
  ): string {
    if (status === '2') {
      return DASH;
    }

    const isFullyVatFree =
      computedLines.length > 0 &&
      computedLines.every((computedLine) => computedLine.vatRate === 'NO_VAT');

    return isFullyVatFree ? 'Без НДС' : formatMoneyRu(vatTotalKopecks);
  }
}
