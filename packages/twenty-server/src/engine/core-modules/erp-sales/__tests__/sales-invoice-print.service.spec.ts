import { NotFoundException } from '@nestjs/common';

import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { formatMoneyRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const INVOICE_ID = 'invoice-1';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const buildFakeWorkspaceContext = (): ORMWorkspaceContext => {
  return {
    authContext: buildSystemAuthContext(WORKSPACE_ID),
    objectIdByNameSingular: { item: 'object-item' },
  } as unknown as ORMWorkspaceContext;
};

const ORGANIZATION = {
  id: 'organization-1',
  name: 'ООО «Ромашка»',
  inn: '7728168971',
  kpp: '772801001',
  directorName: 'Петров П. П.',
  accountantName: 'Сидорова А. В.',
};

const CUSTOMER = {
  id: 'company-1',
  name: 'ООО «Василёк»',
  inn: '7704407589',
  kpp: '770401001',
  legalAddress: '119019, г. Москва, ул. Новый Арбат, д. 10',
};

const INVOICE = {
  id: INVOICE_ID,
  number: '42',
  postingDate: '2026-08-26',
  organizationId: 'organization-1',
  customerId: 'company-1',
};

const LINES = [
  {
    id: 'line-1',
    name: 'Ноутбук Lenovo ThinkPad E16',
    quantity: 1,
    price: rubles(85_000),
    vatRate: 'VAT_20',
    itemId: 'item-1',
    createdAt: '2026-08-26T10:00:00.000Z',
  },
];

const ITEMS = [{ id: 'item-1', name: 'Ноутбук', sku: 'NB-E16', unit: 'PIECE' }];

const createMockRepository = () => ({
  findBy: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
});

type MockRepository = ReturnType<typeof createMockRepository>;

// Defaults to "no active override -> render the built-in template
// unchanged". Individual tests override resolveTemplateHtml's mock to
// exercise the custom-template wiring instead.
type ResolvedTemplate = {
  html: string;
  source: 'custom' | 'built-in';
  fallbackReason: string | null;
};

const createMockPrintTemplateService = () => ({
  findActiveTemplate: jest.fn().mockResolvedValue(null),
  resolveTemplateHtml: jest.fn(
    (_activeOverride: unknown, builtInHtml: string): ResolvedTemplate => ({
      html: builtInHtml,
      source: 'built-in',
      fallbackReason: null,
    }),
  ),
});

describe('SalesInvoicePrintService', () => {
  let service: SalesInvoicePrintService;
  let repositories: Record<string, MockRepository>;
  let printTemplateService: ReturnType<typeof createMockPrintTemplateService>;

  beforeEach(() => {
    repositories = {
      salesInvoice: createMockRepository(),
      salesInvoiceLine: createMockRepository(),
      organization: createMockRepository(),
      company: createMockRepository(),
      item: createMockRepository(),
    };
    repositories.salesInvoice.findOneBy.mockResolvedValue({ ...INVOICE });
    repositories.salesInvoiceLine.findBy.mockResolvedValue(
      LINES.map((line) => ({ ...line })),
    );
    repositories.organization.findOneBy.mockResolvedValue({ ...ORGANIZATION });
    repositories.company.findOneBy.mockResolvedValue({ ...CUSTOMER });
    repositories.item.findBy.mockResolvedValue(
      ITEMS.map((item) => ({ ...item })),
    );

    const ormManager = {
      executeInWorkspaceContext: jest.fn((callback: () => unknown) =>
        withWorkspaceContext(buildFakeWorkspaceContext(), callback),
      ),
      getRepository: jest.fn(
        async (_workspaceId: string, objectNameSingular: string) =>
          repositories[objectNameSingular],
      ),
    };

    printTemplateService = createMockPrintTemplateService();

    service = new SalesInvoicePrintService(
      ormManager as unknown as GlobalWorkspaceOrmManager,
      printTemplateService as unknown as PrintTemplateService,
    );
  });

  it('throws NotFoundException when the invoice does not exist', async () => {
    repositories.salesInvoice.findOneBy.mockResolvedValue(null);

    await expect(
      service.renderSalesInvoiceHtml(WORKSPACE_ID, INVOICE_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('renders the built-in template with no leftover placeholders', async () => {
    const html = await service.renderSalesInvoiceHtml(WORKSPACE_ID, INVOICE_ID);

    expect(html).not.toContain('{{');
    expect(html).toContain('Счёт на оплату № 42');
    expect(html).toContain('Ноутбук Lenovo ThinkPad E16');
    expect(html).toContain(formatMoneyRu(8_500_000));
  });

  // Task 6 (ruling): «Исправление № N от <дата>» под заголовком, только при
  // revisionNumber>0 — ordinary (non-amended) invoices show nothing.
  it('omits the revision line for an ordinary invoice (revisionNumber absent/0)', async () => {
    const html = await service.renderSalesInvoiceHtml(WORKSPACE_ID, INVOICE_ID);

    expect(html).toContain('<div class="revision-line"></div>');
    expect(html).not.toContain('Исправление №');
  });

  it('shows «Исправление № N от <дата счёта>» when revisionNumber>0', async () => {
    repositories.salesInvoice.findOneBy.mockResolvedValue({
      ...INVOICE,
      revisionNumber: 2,
      invoiceDate: '2026-08-27',
      postingDate: undefined,
    });

    const html = await service.renderSalesInvoiceHtml(WORKSPACE_ID, INVOICE_ID);

    expect(html).toContain('Исправление № 2 от 27 августа 2026 г.');
  });

  // Task 7 (ruling): статический СБП-QR (ГОСТ Р 56042-2014 / ST00012) —
  // блок под подписями, пропущен целиком без полного набора обязательных
  // банковских реквизитов организации счёта.
  describe('sbpQr block', () => {
    // The built-in template's own <style> always carries the .sbp-qr CSS
    // rules (harmless — nothing references them without the block markup),
    // so these tests assert on the rendered ELEMENT/caption/image, not on
    // the bare "sbp-qr" substring which the stylesheet always contains.
    beforeEach(() => {
      // QRCode.toDataURL's Node PNG encoder (pngjs) schedules its work via
      // setTimeout; jest.config.mjs enables fake timers globally, which
      // would otherwise stall it forever in the two tests that actually
      // render a QR image below.
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('omits the QR block when the organization has no bank requisites (fixture default: no bankName/bik/settlementAccount/corrAccount)', async () => {
      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).not.toContain('<table class="sbp-qr">');
      expect(html).not.toContain('Оплата по QR (СБП/интернет-банк)');
      expect(html).not.toContain('<img');
      expect(html).not.toContain('data:image');
      expect(html).not.toContain('{{');
    });

    it('renders a data-URI QR image with the ST00012 payload as alt text when the organization has full requisites', async () => {
      repositories.organization.findOneBy.mockResolvedValue({
        ...ORGANIZATION,
        bankName: 'ПАО Сбербанк',
        bik: '044525225',
        settlementAccount: '40702810438000012345',
        corrAccount: '30101810400000000225',
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toContain('class="sbp-qr"');
      expect(html).toContain('Оплата по QR (СБП/интернет-банк)');
      expect(html).toMatch(/<img src="data:image\/png;base64,[^"]+"/);
      expect(html).toContain('alt="ST00012|Name=');
      expect(html).not.toContain('{{sbpQr');
    });

    // Review finding (Major): the sbpQr block used to be pre-rendered via
    // its own fillPlaceholders call, then spliced into the template BEFORE
    // the header-level fillPlaceholders pass — a second, separate pass over
    // already-substituted text. A literal "{{knownPlaceholder}}"-shaped
    // substring inside organization-controlled data (here: the org name)
    // would survive the first pass intact (values are never re-scanned) but
    // then get matched and replaced by the SECOND pass, corrupting the QR
    // alt text with unrelated header data. Exactly the double-substitution
    // class of bug fillPrintTemplate's LINE_BLOCK_SENTINEL already guards
    // against for the line block — this pins the same guarantee for sbpQr.
    it('does not mangle a literal "{{knownPlaceholder}}"-shaped substring in the organization name via a second substitution pass', async () => {
      repositories.organization.findOneBy.mockResolvedValue({
        ...ORGANIZATION,
        name: 'ООО «{{invoice_number}}»',
        bankName: 'ПАО Сбербанк',
        bik: '044525225',
        settlementAccount: '40702810438000012345',
        corrAccount: '30101810400000000225',
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      // Must survive literally inside the QR payload/alt text — not get
      // replaced with the real invoice number ("42") by a stray second pass.
      expect(html).toContain('Name=ООО «{{invoice_number}}»');
    });

    it('HTML-escapes the ST00012 payload inside the alt="" attribute even when the invoice number carries a quote character', async () => {
      repositories.organization.findOneBy.mockResolvedValue({
        ...ORGANIZATION,
        bankName: 'ПАО Сбербанк',
        bik: '044525225',
        settlementAccount: '40702810438000012345',
        corrAccount: '30101810400000000225',
      });
      repositories.salesInvoice.findOneBy.mockResolvedValue({
        ...INVOICE,
        number: '15"test"',
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      // A raw unescaped '"' here would break out of the alt="" attribute.
      expect(html).toContain('15&quot;test&quot;');
      expect(html).not.toMatch(/alt="[^"]*"test"[^"]*"/);
    });
  });

  describe('workspace print-template override', () => {
    const CUSTOM_TEMPLATE = [
      '<div>Счёт № {{invoice_number}} от {{invoice_date}}</div>',
      '<div class="marker">Спасибо за покупку!</div>',
      '<table><tbody>',
      '<!-- BEGIN line -->',
      '<tr><td>{{row_number}}</td><td>{{item_name}}</td><td>{{amount}}</td></tr>',
      '<!-- END line -->',
      '</tbody></table>',
    ].join('\n');

    it('renders the active override instead of the built-in template', async () => {
      printTemplateService.resolveTemplateHtml.mockReturnValue({
        html: CUSTOM_TEMPLATE,
        source: 'custom',
        fallbackReason: null,
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toContain('Спасибо за покупку!');
      expect(html).toContain('Ноутбук Lenovo ThinkPad E16');
      // Built-in-only markup must be gone — the override fully replaced it.
      expect(html).not.toContain('Поставщик');
    });

    it('keeps a literal "{{LatinWord}}" inside line data intact through the override path (Phase 6 guarantee)', async () => {
      printTemplateService.resolveTemplateHtml.mockReturnValue({
        html: CUSTOM_TEMPLATE,
        source: 'custom',
        fallbackReason: null,
      });
      repositories.salesInvoiceLine.findBy.mockResolvedValue([
        {
          id: 'line-1',
          name: 'Кабель {{HDMI}} PRO',
          quantity: 1,
          price: rubles(1_000),
          vatRate: 'VAT_20',
          createdAt: '2026-08-26T10:00:00.000Z',
        },
      ]);

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toContain('Кабель {{HDMI}} PRO');
    });

    it('leaves a placeholder the override introduces but this service does not fill as literal text, not blank', async () => {
      printTemplateService.resolveTemplateHtml.mockReturnValue({
        html: CUSTOM_TEMPLATE.replace(
          'Спасибо за покупку!',
          'Спасибо, {{clown_car}}!',
        ),
        source: 'custom',
        fallbackReason: null,
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toContain('Спасибо, {{clown_car}}!');
    });

    // Task 7: a custom override can reference {{sbpQr}}/{{sbpQrPayload}}
    // directly without declaring a <!-- BEGIN sbpQr --> marker — the
    // built-in template's own conditional block is a SCHET_TEMPLATE_HTML
    // convenience, not a requirement of the fill-карта itself.
    it('fills the flat {{sbpQr}}/{{sbpQrPayload}} placeholders even without a <!-- BEGIN sbpQr --> block marker', async () => {
      // See the "sbpQr block" describe above for why real timers are needed
      // to let QRCode.toDataURL's pngjs-based encoder actually resolve.
      jest.useRealTimers();
      repositories.organization.findOneBy.mockResolvedValue({
        ...ORGANIZATION,
        bankName: 'ПАО Сбербанк',
        bik: '044525225',
        settlementAccount: '40702810438000012345',
        corrAccount: '30101810400000000225',
      });
      printTemplateService.resolveTemplateHtml.mockReturnValue({
        html: CUSTOM_TEMPLATE.replace(
          'Спасибо за покупку!',
          '<img src="{{sbpQr}}" alt="{{sbpQrPayload}}">',
        ),
        source: 'custom',
        fallbackReason: null,
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toMatch(/<img src="data:image\/png;base64,[^"]+"/);
      expect(html).toContain('alt="ST00012|Name=');

      jest.useFakeTimers();
    });

    it('leaves the flat sbpQr placeholders as empty strings (not "{{...}}") when the organization has no bank requisites', async () => {
      printTemplateService.resolveTemplateHtml.mockReturnValue({
        html: CUSTOM_TEMPLATE.replace(
          'Спасибо за покупку!',
          '[{{sbpQr}}][{{sbpQrPayload}}]',
        ),
        source: 'custom',
        fallbackReason: null,
      });

      const html = await service.renderSalesInvoiceHtml(
        WORKSPACE_ID,
        INVOICE_ID,
      );

      expect(html).toContain('[][]');
      expect(html).not.toContain('{{sbpQr');
    });
  });
});
