// Same collaborator-faking technique as reconciliation.service.spec.ts: the
// real manager transitively imports TypeORM entities/GraphQL DTOs that
// cannot load in a unit-test environment.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';

const rub = (amount: number) => ({
  amountMicros: amount * 1_000_000,
  currencyCode: 'RUB',
});

type FakeRepository = { findBy: jest.Mock; findOneBy: jest.Mock };

const buildFakeRepository = (
  overrides: Partial<FakeRepository> = {},
): FakeRepository => ({
  findBy: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  ...overrides,
});

const emptyRepos = () => ({
  organization: buildFakeRepository(),
  company: buildFakeRepository(),
  payment: buildFakeRepository(),
  salesInvoice: buildFakeRepository(),
  supplierPayment: buildFakeRepository(),
  supplierInvoice: buildFakeRepository(),
  supplierInvoiceLine: buildFakeRepository(),
  goodsReceipt: buildFakeRepository(),
  goodsReceiptLine: buildFakeRepository(),
  salesShipment: buildFakeRepository(),
  salesShipmentLine: buildFakeRepository(),
  item: buildFakeRepository(),
});

const createService = (
  repositoriesByObjectName: Record<string, FakeRepository>,
) => {
  const transactionScope: WorkspaceTransactionScope = {
    getRepository: jest.fn(
      (objectName: string) => repositoriesByObjectName[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  };
  const fakeGlobalWorkspaceOrmManager = {
    executeInWorkspaceContext: (fn: () => unknown) => fn(),
    runInWorkspaceTransaction: (
      work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
    ) => work(transactionScope),
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new KudirService(fakeGlobalWorkspaceOrmManager),
    transactionScope,
  };
};

describe('KudirService.getKudirData — organization gate', () => {
  it('throws NotFoundException when the organization does not exist', async () => {
    const { service } = createService(emptyRepos());

    await expect(
      service.getKudirData(WORKSPACE_ID, ORGANIZATION_ID, 2026),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['OSNO', 'PATENT', null, undefined])(
    'refuses a non-УСН organization (taxSystem=%p)',
    async (taxSystem) => {
      const repos = emptyRepos();

      repos.organization.findOneBy.mockResolvedValue({
        id: ORGANIZATION_ID,
        name: 'ООО Ромашка',
        taxSystem,
      });

      const { service } = createService(repos);

      await expect(
        service.getKudirData(WORKSPACE_ID, ORGANIZATION_ID, 2026),
      ).rejects.toThrow(BadRequestException);
      expect(repos.payment.findBy).not.toHaveBeenCalled();
    },
  );
});

describe('KudirService.getKudirData — УСН «доходы»', () => {
  const usnIncomeOrg = {
    id: ORGANIZATION_ID,
    name: 'ООО Ромашка',
    fullName: null,
    inn: '7712345678',
    taxSystem: 'USN_INCOME',
  };

  it('builds an income entry from a POSTED payment, dated by postingDate (not the invoice date)', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeOrg);
    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        number: 'PAY-000001',
        postingDate: '2026-01-15', // != invoiceDate below
        amount: rub(1220),
        payerId: 'company-1',
        salesInvoiceId: 'invoice-1',
      },
    ]);
    repos.salesInvoice.findBy.mockResolvedValue([
      {
        id: 'invoice-1',
        number: 'SI-000001',
        invoiceDate: '2026-01-10',
        customerId: 'company-1',
      },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-1', name: 'ООО Контрагент' },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );

    expect(data.taxSystemLabel).toBe('Доходы');
    const movementRow = data.entries.find((entry) => entry.seq !== null);

    expect(movementRow).toEqual(
      expect.objectContaining({
        date: '2026-01-15',
        incomeKopecks: 122_000,
        expenseKopecks: 0,
      }),
    );
    expect(movementRow?.content).toBe(
      'Оплата по счёту № SI-000001 от 10.01.2026, ООО Контрагент',
    );
    expect(data.totalIncomeKopecks).toBe(122_000);
    // Never touches any expense-side source for УСН «доходы».
    expect(repos.supplierPayment.findBy).not.toHaveBeenCalled();
    expect(repos.supplierInvoice.findBy).not.toHaveBeenCalled();
    expect(repos.goodsReceipt.findBy).not.toHaveBeenCalled();
    expect(repos.salesShipment.findBy).not.toHaveBeenCalled();
  });

  it('falls back to a no-invoice content string when the payment is unlinked', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeOrg);
    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        number: null,
        postingDate: '2026-01-15',
        amount: rub(500),
        payerId: null,
        salesInvoiceId: null,
      },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    const movementRow = data.entries.find((entry) => entry.seq !== null);

    expect(movementRow?.content).toBe('Поступление оплаты');
    expect(movementRow?.documentLabel).toBe(
      'Поступление оплаты № б/н от 15.01.2026',
    );
  });

  it('falls back to postedAt (truncated to a date) when postingDate was never persisted on the document', async () => {
    // PostingService (posting.service.ts) only ever WRITES docStatus/
    // postedAt on post — it never backfills the document's own postingDate
    // column when the caller left it unset at creation (the common e2e
    // case). GL entries still get dated correctly via a separate in-memory
    // fallback that's never persisted back — КУДиР reads the document
    // itself, so it needs its own fallback (resolveDocumentDate).
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeOrg);
    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        number: 'PAY-000001',
        postingDate: null, // never set at creation
        postedAt: '2026-01-15T09:30:00.000Z',
        amount: rub(500),
        payerId: null,
        salesInvoiceId: null,
      },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    const movementRow = data.entries.find((entry) => entry.seq !== null);

    expect(movementRow).toEqual(
      expect.objectContaining({ date: '2026-01-15', incomeKopecks: 50_000 }),
    );
  });

  it('handles postedAt hydrated as a native Date instance (twenty-orm repository layer, not the GraphQL string form)', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeOrg);
    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        number: 'PAY-000002',
        postingDate: null,
        postedAt: new Date('2026-03-02T18:00:00.000Z'),
        amount: rub(700),
        payerId: null,
        salesInvoiceId: null,
      },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    const movementRow = data.entries.find((entry) => entry.seq !== null);

    expect(movementRow).toEqual(
      expect.objectContaining({ date: '2026-03-02', incomeKopecks: 70_000 }),
    );
  });

  it('excludes a POSTED payment dated outside the requested year', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeOrg);
    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        postingDate: '2025-12-31',
        amount: rub(500),
        payerId: null,
        salesInvoiceId: null,
      },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );

    expect(data.entries.every((entry) => entry.seq === null)).toBe(true);
    expect(data.totalIncomeKopecks).toBe(0);
  });
});

describe('KudirService.getKudirData — УСН «доходы минус расходы»', () => {
  const usnIncomeExpenseOrg = {
    id: ORGANIZATION_ID,
    name: 'ООО Ромашка',
    fullName: null,
    inn: '7712345678',
    taxSystem: 'USN_INCOME_EXPENSE',
  };

  it('builds a service-expense entry from a supplierPayment on an invoice with no item lines', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeExpenseOrg);
    repos.supplierPayment.findBy.mockResolvedValue([
      {
        id: 'spay-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        number: 'SP-000001',
        postingDate: '2026-02-01',
        amount: rub(3000),
        supplierId: 'company-2',
        supplierInvoiceId: 'sinv-1',
      },
    ]);
    repos.supplierInvoice.findBy.mockImplementation(async () => [
      {
        id: 'sinv-1',
        number: 'PI-000001',
        invoiceDate: '2026-01-25',
        supplierId: 'company-2',
        paymentStatus: 'PAID',
      },
    ]);
    repos.supplierInvoiceLine.findBy.mockResolvedValue([
      { id: 'line-1', supplierInvoiceId: 'sinv-1', itemId: null },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-2', name: 'ООО Поставщик' },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    const expenseRow = data.entries.find((entry) => entry.seq !== null);

    expect(expenseRow).toEqual(
      expect.objectContaining({
        date: '2026-02-01',
        incomeKopecks: 0,
        expenseKopecks: 300_000,
      }),
    );
    expect(expenseRow?.content).toBe(
      'Оплата по счёту поставщика № PI-000001 от 25.01.2026, ООО Поставщик',
    );
  });

  it('does NOT expense a supplierPayment whose invoice has item lines directly (routed via triple condition instead)', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeExpenseOrg);
    repos.supplierPayment.findBy.mockResolvedValue([
      {
        id: 'spay-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        postingDate: '2026-02-01',
        amount: rub(1000),
        supplierId: 'company-2',
        supplierInvoiceId: 'sinv-1',
      },
    ]);
    // Called twice: once by buildServiceExpenseEntries (id IN [...]), once
    // by buildGoodsExpenseEntries (organizationId+docStatus+paymentStatus) —
    // both queries match this one invoice, so a single resolved value covers
    // both call sites.
    repos.supplierInvoice.findBy.mockResolvedValue([
      {
        id: 'sinv-1',
        number: 'PI-000001',
        invoiceDate: '2026-01-25',
        supplierId: 'company-2',
        paymentStatus: 'PAID',
      },
    ]);
    repos.supplierInvoiceLine.findBy.mockResolvedValue([
      {
        id: 'line-1',
        supplierInvoiceId: 'sinv-1',
        itemId: 'item-1',
        quantity: 4,
        amount: rub(1000),
      },
    ]);
    // Goods conditions unmet (no receipts/shipments at all) — no expense row
    // should appear anywhere for this invoice.
    repos.company.findBy.mockResolvedValue([
      { id: 'company-2', name: 'ООО Поставщик' },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );

    expect(data.entries.every((entry) => entry.seq === null)).toBe(true);
    expect(data.totalExpenseKopecks).toBe(0);
  });

  it('recognizes a товарный expense once the triple condition (оприходован+оплачен+реализован) is fully met, on the LATEST of the three dates', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeExpenseOrg);
    repos.supplierInvoice.findBy.mockResolvedValue([
      {
        id: 'sinv-1',
        number: 'PI-000001',
        invoiceDate: '2026-01-01',
        supplierId: 'company-2',
        paymentStatus: 'PAID',
      },
    ]);
    repos.supplierInvoiceLine.findBy.mockResolvedValue([
      {
        id: 'line-1',
        supplierInvoiceId: 'sinv-1',
        itemId: 'item-1',
        quantity: 4,
        amount: rub(400),
      },
    ]);
    repos.supplierPayment.findBy.mockResolvedValue([
      {
        id: 'spay-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        postingDate: '2026-01-10', // paid — not the latest event
        amount: rub(400),
        supplierId: 'company-2',
        supplierInvoiceId: 'sinv-1',
      },
    ]);
    repos.goodsReceipt.findBy.mockResolvedValue([
      {
        id: 'gr-1',
        supplierInvoiceId: 'sinv-1',
        docStatus: 'POSTED',
        postingDate: '2026-01-05', // received — not the latest event
      },
    ]);
    repos.goodsReceiptLine.findBy.mockResolvedValue([
      { id: 'grl-1', goodsReceiptId: 'gr-1', itemId: 'item-1', quantity: 4 },
    ]);
    repos.salesShipment.findBy.mockResolvedValue([
      {
        id: 'ss-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        postingDate: '2026-03-20', // sold — the LATEST event
      },
    ]);
    repos.salesShipmentLine.findBy.mockResolvedValue([
      { id: 'ssl-1', salesShipmentId: 'ss-1', itemId: 'item-1', quantity: 4 },
    ]);
    repos.item.findBy.mockResolvedValue([{ id: 'item-1', name: 'Товар А' }]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-2', name: 'ООО Поставщик' },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    const expenseRow = data.entries.find((entry) => entry.seq !== null);

    expect(expenseRow).toEqual(
      expect.objectContaining({
        date: '2026-03-20', // MAX(оплачен 01-10, оприходован 01-05, реализован 03-20)
        incomeKopecks: 0,
        expenseKopecks: 40_000,
      }),
    );
    expect(expenseRow?.content).toBe(
      'Списание в расходы товара «Товар А» (4), поставщик ООО Поставщик',
    );
    expect(data.totalExpenseKopecks).toBe(40_000);
  });

  it('recognizes NO expense when the item has not been (fully) sold yet — «не реализован → нет расхода»', async () => {
    const repos = emptyRepos();

    repos.organization.findOneBy.mockResolvedValue(usnIncomeExpenseOrg);
    repos.supplierInvoice.findBy.mockResolvedValue([
      {
        id: 'sinv-1',
        number: 'PI-000001',
        invoiceDate: '2026-01-01',
        supplierId: 'company-2',
        paymentStatus: 'PAID',
      },
    ]);
    repos.supplierInvoiceLine.findBy.mockResolvedValue([
      {
        id: 'line-1',
        supplierInvoiceId: 'sinv-1',
        itemId: 'item-1',
        quantity: 4,
        amount: rub(400),
      },
    ]);
    repos.supplierPayment.findBy.mockResolvedValue([
      {
        id: 'spay-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        postingDate: '2026-01-10',
        amount: rub(400),
        supplierId: 'company-2',
        supplierInvoiceId: 'sinv-1',
      },
    ]);
    repos.goodsReceipt.findBy.mockResolvedValue([
      {
        id: 'gr-1',
        supplierInvoiceId: 'sinv-1',
        docStatus: 'POSTED',
        postingDate: '2026-01-05',
      },
    ]);
    repos.goodsReceiptLine.findBy.mockResolvedValue([
      { id: 'grl-1', goodsReceiptId: 'gr-1', itemId: 'item-1', quantity: 4 },
    ]);
    // No sales shipments at all — item never resold.
    repos.item.findBy.mockResolvedValue([{ id: 'item-1', name: 'Товар А' }]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-2', name: 'ООО Поставщик' },
    ]);

    const { service } = createService(repos);
    const data = await service.getKudirData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );

    expect(data.entries.every((entry) => entry.seq === null)).toBe(true);
    expect(data.totalExpenseKopecks).toBe(0);
  });
});
