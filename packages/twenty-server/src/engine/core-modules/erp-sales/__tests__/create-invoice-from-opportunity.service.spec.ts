// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment — same technique as
// create-invoice-revision.service.spec.ts / month-close.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateInvoiceFromOpportunityService } from 'src/engine/core-modules/erp-sales/services/create-invoice-from-opportunity.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

type Row = Record<string, unknown> & { id: string };
type WhereClause = Record<string, unknown>;
type OrderClause = Record<string, 'ASC' | 'DESC'>;

const matches = (row: Row, where: WhereClause) =>
  Object.entries(where).every(([key, value]) => row[key] === value);

const applyOrder = (rows: Row[], order?: OrderClause): Row[] => {
  if (!order) {
    return rows;
  }

  const [[key, direction]] = Object.entries(order);

  return [...rows].sort((firstRow, secondRow) => {
    const firstValue = String(firstRow[key] ?? '');
    const secondValue = String(secondRow[key] ?? '');
    const comparison = firstValue.localeCompare(secondValue);

    return direction === 'ASC' ? comparison : -comparison;
  });
};

// Stateful fake (same technique as create-invoice-revision.service.spec.ts):
// save() persists, findOneBy/findOne read back.
const buildRepository = (initialRows: Row[] = []) => {
  const rows: Row[] = [...initialRows];

  return {
    findOneBy: jest.fn(
      async (where: WhereClause) =>
        rows.find((row) => matches(row, where)) ?? null,
    ),
    findOne: jest.fn(
      async ({
        where,
        order,
      }: {
        where?: WhereClause;
        order?: OrderClause;
      }) => {
        const candidates = where
          ? rows.filter((row) => matches(row, where))
          : rows;

        return applyOrder(candidates, order)[0] ?? null;
      },
    ),
    save: jest.fn(async (row: Row) => {
      rows.push(row);

      return row;
    }),
    _rows: rows,
  };
};

type FakeRepository = ReturnType<typeof buildRepository>;

const createService = ({
  opportunityRows = [],
  organizationRows = [],
  invoiceRows = [],
  lineRows = [],
}: {
  opportunityRows?: Row[];
  organizationRows?: Row[];
  invoiceRows?: Row[];
  lineRows?: Row[];
} = {}) => {
  const opportunityRepository = buildRepository(opportunityRows);
  const organizationRepository = buildRepository(organizationRows);
  const invoiceRepository = buildRepository(invoiceRows);
  const lineRepository = buildRepository(lineRows);
  const repositoriesByObjectName: Record<string, FakeRepository> = {
    opportunity: opportunityRepository,
    organization: organizationRepository,
    salesInvoice: invoiceRepository,
    salesInvoiceLine: lineRepository,
  };
  const transactionScope = {
    getRepository: jest.fn(
      (objectName: string) => repositoriesByObjectName[objectName],
    ),
  } as unknown as WorkspaceTransactionScope;
  const fakeGlobalWorkspaceOrmManager = {
    executeInWorkspaceContext: (fn: () => unknown) => fn(),
    runInWorkspaceTransaction: (
      work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
    ) => work(transactionScope),
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new CreateInvoiceFromOpportunityService(
      fakeGlobalWorkspaceOrmManager,
    ),
    opportunityRepository,
    organizationRepository,
    invoiceRepository,
    lineRepository,
  };
};

const OPPORTUNITY_ID = 'opportunity-1';

const opportunity = (overrides: Partial<Row> = {}): Row => ({
  id: OPPORTUNITY_ID,
  name: 'Ромашка — годовой контракт',
  companyId: 'company-1',
  amount: { amountMicros: 150_000_000_000, currencyCode: 'RUB' },
  ...overrides,
});

const defaultOrganization: Row = {
  id: 'organization-default',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CreateInvoiceFromOpportunityService', () => {
  it('throws NotFoundException when the opportunity does not exist', async () => {
    const { service } = createService();

    await expect(
      service.createInvoiceFromOpportunity(WORKSPACE_ID, 'unknown-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses when the deal has no company — «У сделки не указана компания»', async () => {
    const { service } = createService({
      opportunityRows: [opportunity({ companyId: null })],
      organizationRows: [defaultOrganization],
    });

    await expect(
      service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID),
    ).rejects.toThrow(/У сделки не указана компания/);
  });

  it('refuses when there is no organization at all', async () => {
    const { service } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [],
    });

    await expect(
      service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID),
    ).rejects.toThrow(/Нет ни одной организации/);
  });

  it('picks the isDefault organization when several exist', async () => {
    const { service, invoiceRepository } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [
        { id: 'organization-old', isDefault: false, createdAt: '2025-01-01' },
        defaultOrganization,
      ],
    });

    await service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID);

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.organizationId).toBe('organization-default');
  });

  it('falls back to the earliest-created organization when none is isDefault', async () => {
    const { service, invoiceRepository } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [
        {
          id: 'organization-second',
          isDefault: false,
          createdAt: '2026-02-01T00:00:00.000Z',
        },
        {
          id: 'organization-first',
          isDefault: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    await service.createInvoiceFromOpportunity(WORKSPACE_ID, OPPORTUNITY_ID);

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.organizationId).toBe('organization-first');
  });

  it('maps the deal onto the header and a single line: customer, opportunity link, price/amount from the deal CURRENCY in kopecks, qty 1, VAT_22 default', async () => {
    const { service, invoiceRepository, lineRepository } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [defaultOrganization],
    });

    const result = await service.createInvoiceFromOpportunity(
      WORKSPACE_ID,
      OPPORTUNITY_ID,
    );

    expect(result.success).toBe(true);
    expect(result.wasExisting).toBe(false);

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.docStatus).toBe('DRAFT');
    expect(savedInvoice.customerId).toBe('company-1');
    expect(savedInvoice.organizationId).toBe('organization-default');
    expect(savedInvoice.opportunityId).toBe(OPPORTUNITY_ID);
    expect(savedInvoice.name).toContain('Ромашка');
    expect(savedInvoice.comment).toContain('Ромашка');

    expect(lineRepository.save).toHaveBeenCalledTimes(1);

    const savedLine = lineRepository.save.mock.calls[0][0] as Row;

    // amount 150_000_000_000 micros = 150_000 kopecks (1 500 ₽) → composite
    // rebuilt clean, no residual GraphQL keys.
    expect(savedLine.price).toEqual({
      amountMicros: 150_000_000_000,
      currencyCode: 'RUB',
    });
    expect(savedLine.amount).toEqual(savedLine.price);
    expect(savedLine.quantity).toBe(1);
    expect(savedLine.vatRate).toBe('VAT_22');
    expect(savedLine.name).toBe(
      'Услуги по сделке "Ромашка — годовой контракт"',
    );
    expect(savedLine.salesInvoiceId).toBe(result.id);
  });

  it('is idempotent: a second call while the invoice is still DRAFT returns the same id, no new line', async () => {
    const { service, invoiceRepository, lineRepository } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [defaultOrganization],
    });

    const first = await service.createInvoiceFromOpportunity(
      WORKSPACE_ID,
      OPPORTUNITY_ID,
    );
    const second = await service.createInvoiceFromOpportunity(
      WORKSPACE_ID,
      OPPORTUNITY_ID,
    );

    expect(second.id).toBe(first.id);
    expect(second.wasExisting).toBe(true);
    expect(invoiceRepository.save).toHaveBeenCalledTimes(1);
    expect(lineRepository.save).toHaveBeenCalledTimes(1);
  });

  it('creates a NEW invoice once the previous one is no longer DRAFT (posted or cancelled)', async () => {
    const { service, invoiceRepository } = createService({
      opportunityRows: [opportunity()],
      organizationRows: [defaultOrganization],
    });

    const first = await service.createInvoiceFromOpportunity(
      WORKSPACE_ID,
      OPPORTUNITY_ID,
    );

    const firstInvoiceRow = invoiceRepository._rows.find(
      (row) => row.id === first.id,
    );

    if (firstInvoiceRow) {
      firstInvoiceRow.docStatus = 'POSTED';
    }

    const second = await service.createInvoiceFromOpportunity(
      WORKSPACE_ID,
      OPPORTUNITY_ID,
    );

    expect(second.id).not.toBe(first.id);
    expect(second.wasExisting).toBe(false);
    expect(invoiceRepository.save).toHaveBeenCalledTimes(2);
  });
});
