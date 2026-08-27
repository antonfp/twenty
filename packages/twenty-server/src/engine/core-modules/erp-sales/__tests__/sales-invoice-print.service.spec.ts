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
  });
});
