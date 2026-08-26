import { NotFoundException } from '@nestjs/common';

import { formatMoneyRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const SHIPMENT_ID = 'shipment-1';

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
  fullName: 'Общество с ограниченной ответственностью «Ромашка»',
  inn: '7728168971',
  kpp: '772801001',
  legalAddress: '117218, г. Москва, ул. Кржижановского, д. 14, корп. 3',
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

const SHIPMENT = {
  id: SHIPMENT_ID,
  number: '7',
  postingDate: '2026-08-26',
  organizationId: 'organization-1',
  customerId: 'company-1',
};

// Цены с НДС 20%: 2×85 000 + 10×7 800 + 1×12 000 = 260 000,00;
// НДС = 28 333,33 + 13 000,00 + 2 000,00 = 43 333,33; без НДС = 216 666,67.
const LINES = [
  {
    id: 'line-1',
    name: 'Ноутбук Lenovo ThinkPad E16',
    quantity: 2,
    price: rubles(85_000),
    vatRate: 'VAT_20',
    itemId: 'item-1',
    createdAt: '2026-08-26T10:00:00.000Z',
  },
  {
    id: 'line-2',
    name: 'Мышь Logitech MX Master 3S',
    quantity: 10,
    price: rubles(7_800),
    vatRate: 'VAT_20',
    itemId: 'item-1',
    createdAt: '2026-08-26T10:01:00.000Z',
  },
  {
    id: 'line-3',
    name: 'Доставка до склада покупателя',
    quantity: 1,
    price: rubles(12_000),
    vatRate: 'VAT_20',
    itemId: 'item-2',
    createdAt: '2026-08-26T10:02:00.000Z',
  },
];

const ITEMS = [
  { id: 'item-1', name: 'Ноутбук', sku: 'NB-E16', unit: 'PIECE' },
  { id: 'item-2', name: 'Доставка', sku: '', unit: 'SERVICE' },
];

const createMockRepository = () => ({
  findBy: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
});

type MockRepository = ReturnType<typeof createMockRepository>;

describe('SalesShipmentPrintService', () => {
  let service: SalesShipmentPrintService;
  let repositories: Record<string, MockRepository>;

  beforeEach(() => {
    repositories = {
      salesShipment: createMockRepository(),
      salesShipmentLine: createMockRepository(),
      organization: createMockRepository(),
      company: createMockRepository(),
      item: createMockRepository(),
    };
    repositories.salesShipment.findOneBy.mockResolvedValue({ ...SHIPMENT });
    repositories.salesShipmentLine.findBy.mockResolvedValue(
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

    service = new SalesShipmentPrintService(
      ormManager as unknown as GlobalWorkspaceOrmManager,
    );
  });

  it('throws NotFoundException when the shipment does not exist', async () => {
    repositories.salesShipment.findOneBy.mockResolvedValue(null);

    await expect(
      service.renderSalesShipmentUpdHtml(WORKSPACE_ID, SHIPMENT_ID, '2'),
    ).rejects.toThrow(NotFoundException);
  });

  it('resolves every placeholder in both statuses', async () => {
    for (const status of ['1', '2'] as const) {
      const html = await service.renderSalesShipmentUpdHtml(
        WORKSPACE_ID,
        SHIPMENT_ID,
        status,
      );

      expect(html).not.toContain('{{');
      expect(html).toContain(`Статус: ${status}`);
    }
  });

  it('renders the header requisites and the self-referencing line 5а', async () => {
    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '1',
    );

    expect(html).toContain('№ 7 от 26 августа 2026 г.');
    expect(html).toContain(
      'Общество с ограниченной ответственностью «Ромашка»',
    );
    expect(html).toContain('7728168971/772801001');
    expect(html).toContain('7704407589/770401001');
    expect(html).toContain('№ п/п 1–3 № 7 от 26.08.2026');
    expect(html).toContain('Российский рубль, 643');
    expect(html).toContain('ООО «Ромашка», ИНН 7728168971');
    expect(html).toContain('ООО «Василёк», ИНН 7704407589');
    expect(html).toContain('Петров П. П.');
    expect(html).toContain('Сидорова А. В.');
  });

  it('computes the VAT columns per line and totals from the lines (status 1)', async () => {
    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '1',
    );

    // Строка 1: гр. 9 = 170 000,00; гр. 8 = 28 333,33; гр. 5 = 141 666,67;
    // гр. 4 = 70 833,34 (гр. 5 ÷ кол-во).
    expect(html).toContain(formatMoneyRu(17_000_000));
    expect(html).toContain(formatMoneyRu(2_833_333));
    expect(html).toContain(formatMoneyRu(14_166_667));
    expect(html).toContain(formatMoneyRu(7_083_334));
    // Итоги «Всего к оплате»: гр. 5 / гр. 8 / гр. 9.
    expect(html).toContain(formatMoneyRu(21_666_667));
    expect(html).toContain(formatMoneyRu(4_333_333));
    expect(html).toContain(formatMoneyRu(26_000_000));
    expect(html).toContain('20%');
    expect(html).toContain('без акциза');
    // Коды ОКЕИ: штука 796; услуга — без кода.
    expect(html).toContain('796');
    // Сумма прописью от итога с НДС.
    expect(html).toContain('Двести шестьдесят тысяч рублей 00 копеек');
  });

  it('dashes the invoice-only fields in status 2 (letter ММВ-20-3/96@)', async () => {
    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '2',
    );

    expect(html).not.toContain('20%');
    expect(html).not.toContain('без акциза');
    expect(html).not.toContain(formatMoneyRu(2_833_333));
    expect(html).not.toContain(formatMoneyRu(4_333_333));
    // Денежный измеритель первичного документа остаётся.
    expect(html).toContain(formatMoneyRu(21_666_667));
    expect(html).toContain(formatMoneyRu(26_000_000));
  });

  it('prints «Без НДС» for NO_VAT lines and in the totals of a VAT-free document', async () => {
    repositories.salesShipmentLine.findBy.mockResolvedValue([
      {
        id: 'line-1',
        name: 'Услуга без НДС',
        quantity: 1,
        price: rubles(1_000),
        vatRate: 'NO_VAT',
        createdAt: '2026-08-26T10:00:00.000Z',
      },
    ]);

    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '1',
    );

    expect(html).toContain('Без НДС');
    expect(html).toContain(formatMoneyRu(100_000));
  });

  it('sums mixed VAT rates per line before totalling', async () => {
    repositories.salesShipmentLine.findBy.mockResolvedValue([
      {
        id: 'line-1',
        name: 'Товар 20%',
        quantity: 1,
        price: rubles(120),
        vatRate: 'VAT_20',
        createdAt: '2026-08-26T10:00:00.000Z',
      },
      {
        id: 'line-2',
        name: 'Товар 10%',
        quantity: 1,
        price: rubles(110),
        vatRate: 'VAT_10',
        createdAt: '2026-08-26T10:01:00.000Z',
      },
    ]);

    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '1',
    );

    // НДС: 20,00 + 10,00 = 30,00; без НДС: 100,00 + 100,00 = 200,00;
    // с НДС: 230,00.
    expect(html).toContain(formatMoneyRu(3_000));
    expect(html).toContain(formatMoneyRu(20_000));
    expect(html).toContain(formatMoneyRu(23_000));
    expect(html).toContain('10%');
    expect(html).toContain('20%');
  });

  it('escapes HTML in workspace data', async () => {
    repositories.company.findOneBy.mockResolvedValue({
      ...CUSTOMER,
      name: 'ООО «Тест» <script>alert(1)</script>',
    });

    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '2',
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders dashes for blank requisites instead of "undefined"', async () => {
    repositories.organization.findOneBy.mockResolvedValue({
      id: 'organization-1',
      name: 'ИП Иванов И. И.',
      inn: '772816897100',
    });
    repositories.company.findOneBy.mockResolvedValue(null);

    const html = await service.renderSalesShipmentUpdHtml(
      WORKSPACE_ID,
      SHIPMENT_ID,
      '2',
    );

    expect(html).not.toContain('undefined');
    // ИП без КПП — только ИНН.
    expect(html).toContain('772816897100');
    expect(html).not.toContain('772816897100/');
  });
});
