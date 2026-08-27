// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment — same technique as
// month-close.service.spec.ts / bank-statement-import.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateInvoiceRevisionService } from 'src/engine/core-modules/erp-sales/services/create-invoice-revision.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

type Row = Record<string, unknown> & { id: string };

const matches = (row: Row, where: Record<string, unknown>) =>
  Object.entries(where).every(([key, value]) => row[key] === value);

// Stateful fake (same technique as month-close.service.spec.ts): save()
// persists, findOneBy/findOne/findBy read back — the revision-chain test
// genuinely depends on what a prior save() wrote (amendedFromId of the
// SECOND call must be the id the FIRST call generated, not the original).
const buildRepository = (initialRows: Row[] = []) => {
  const rows: Row[] = [...initialRows];

  return {
    findOneBy: jest.fn(
      async (where: Record<string, unknown>) =>
        rows.find((row) => matches(row, where)) ?? null,
    ),
    findOne: jest.fn(
      async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((row) => matches(row, where)) ?? null,
    ),
    findBy: jest.fn(async (where: Record<string, unknown>) =>
      rows.filter((row) => matches(row, where)),
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
  invoiceRows = [],
  lineRows = [],
}: {
  invoiceRows?: Row[];
  lineRows?: Row[];
} = {}) => {
  const invoiceRepository = buildRepository(invoiceRows);
  const lineRepository = buildRepository(lineRows);
  const repositoriesByObjectName: Record<string, FakeRepository> = {
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
    service: new CreateInvoiceRevisionService(fakeGlobalWorkspaceOrmManager),
    invoiceRepository,
    lineRepository,
  };
};

const SOURCE_ID = 'source-invoice-1';

const postedSource = (overrides: Partial<Row> = {}): Row => ({
  id: SOURCE_ID,
  number: '42',
  docStatus: 'POSTED',
  organizationId: 'organization-1',
  customerId: 'company-1',
  comment: 'важный клиент',
  revisionNumber: 0,
  ...overrides,
});

describe('CreateInvoiceRevisionService', () => {
  it('throws NotFoundException when the source invoice does not exist', async () => {
    const { service } = createService();

    await expect(
      service.createInvoiceRevision(WORKSPACE_ID, 'unknown-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuses a DRAFT source — «черновик правится напрямую»', async () => {
    const { service } = createService({
      invoiceRows: [postedSource({ docStatus: 'DRAFT' })],
    });

    await expect(
      service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID),
    ).rejects.toThrow(/черновик правится напрямую/i);
  });

  it('refuses a CANCELLED source', async () => {
    const { service } = createService({
      invoiceRows: [postedSource({ docStatus: 'CANCELLED' })],
    });

    await expect(
      service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses when the source already has a DRAFT revision, naming its revisionNumber', async () => {
    const { service } = createService({
      invoiceRows: [
        postedSource(),
        {
          id: 'existing-draft-revision',
          docStatus: 'DRAFT',
          amendedFromId: SOURCE_ID,
          revisionNumber: 3,
        },
      ],
    });

    await expect(
      service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID),
    ).rejects.toThrow(/уже есть черновик исправления № 3/);
  });

  // The "already has a DRAFT revision" guard queries WITHOUT withDeleted
  // (deliberately, unlike the restore-record guards elsewhere) — a
  // soft-deleted draft means the accountant discarded it, so a retry must be
  // allowed to create a fresh one, same reasoning as month-close.service.ts's
  // orphan-DRAFT reuse. This asserts the exact (undeleted) query shape.
  it('allows creating a revision when no DRAFT revision exists yet', async () => {
    const { service, invoiceRepository } = createService({
      invoiceRows: [postedSource()],
    });

    const result = await service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID);

    expect(result.success).toBe(true);
    expect(invoiceRepository.findOne).toHaveBeenCalledWith({
      where: { amendedFromId: SOURCE_ID, docStatus: 'DRAFT' },
    });
  });

  it('copies all lines with clean CURRENCY composites, preserving source order (position, then createdAt tie-break)', async () => {
    const sourceLines: Row[] = [
      {
        id: 'line-A',
        salesInvoiceId: SOURCE_ID,
        name: 'Строка A',
        itemId: 'item-1',
        quantity: 2,
        // Simulates a residual key a GraphQL-shaped read could carry —
        // the service must rebuild a CLEAN composite, not spread this.
        price: {
          amountMicros: 100_000_000,
          currencyCode: 'RUB',
          __typename: 'Currency',
        },
        vatRate: 'VAT_20',
        amount: { amountMicros: 200_000_000, currencyCode: 'RUB' },
        position: 0,
        createdAt: '2026-08-01T10:00:00.000Z',
      },
      {
        id: 'line-B',
        salesInvoiceId: SOURCE_ID,
        name: 'Строка B',
        itemId: null,
        quantity: 1,
        price: { amountMicros: 50_000_000, currencyCode: 'RUB' },
        vatRate: 'VAT_10',
        amount: { amountMicros: 50_000_000, currencyCode: 'RUB' },
        position: 0,
        // Earlier createdAt than line-A despite same position -> must sort first.
        createdAt: '2026-08-01T09:00:00.000Z',
      },
    ];
    const { service, lineRepository } = createService({
      invoiceRows: [postedSource()],
      lineRows: sourceLines,
    });

    const result = await service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID);

    expect(result.linesCopied).toBe(2);
    expect(lineRepository.save).toHaveBeenCalledTimes(2);

    const [firstSavedLine, secondSavedLine] =
      lineRepository.save.mock.calls.map((call) => call[0] as Row);

    // Order preserved: line-B (earlier createdAt) before line-A.
    expect(firstSavedLine.name).toBe('Строка B');
    expect(secondSavedLine.name).toBe('Строка A');

    // Fresh id, no leftover id/createdAt/__typename from the source row.
    expect(firstSavedLine.id).not.toBe('line-B');
    expect(secondSavedLine.id).not.toBe('line-A');
    expect(firstSavedLine).not.toHaveProperty('createdAt');
    expect(firstSavedLine).not.toHaveProperty('__typename');

    // CURRENCY composite rebuilt clean — exactly amountMicros/currencyCode,
    // the __typename on the source line must not survive the copy.
    expect(secondSavedLine.price).toEqual({
      amountMicros: 100_000_000,
      currencyCode: 'RUB',
    });
    expect(Object.keys(secondSavedLine.price as object).sort()).toEqual([
      'amountMicros',
      'currencyCode',
    ]);

    for (const savedLine of [firstSavedLine, secondSavedLine]) {
      expect(savedLine.salesInvoiceId).toBe(result.id);
    }
  });

  it('sets amendedFrom/revisionNumber/number on the new DRAFT and leaves the source untouched', async () => {
    const { service, invoiceRepository } = createService({
      invoiceRows: [postedSource()],
    });

    const result = await service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID);

    expect(result.number).toBe('42');
    expect(result.revisionNumber).toBe(1);
    expect(result.sourceId).toBe(SOURCE_ID);
    expect(result.message).toContain('Оригинал остаётся проведённым');

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.docStatus).toBe('DRAFT');
    expect(savedInvoice.number).toBe('42'); // same number as source
    expect(savedInvoice.amendedFromId).toBe(SOURCE_ID);
    expect(savedInvoice.revisionNumber).toBe(1);
    expect(savedInvoice.customerId).toBe('company-1');
    expect(savedInvoice.organizationId).toBe('organization-1');

    // Source itself untouched — no update() call, still POSTED in the rows.
    const [sourceRowAfter] = invoiceRepository._rows.filter(
      (row) => row.id === SOURCE_ID,
    );

    expect(sourceRowAfter.docStatus).toBe('POSTED');
  });

  // Review Major (phase-9 final): a revision must keep the source's
  // opportunityId, otherwise create-invoice-from-opportunity's idempotent
  // DRAFT guard (matches on opportunityId) goes blind to this DRAFT and
  // creates a second invoice for the full deal amount.
  it('copies opportunityId onto the revision so the T8 idempotency guard still finds it', async () => {
    const { service, invoiceRepository } = createService({
      invoiceRows: [postedSource({ opportunityId: 'opportunity-1' })],
    });

    await service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID);

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.opportunityId).toBe('opportunity-1');
  });

  it('leaves opportunityId null when the source has no opportunity', async () => {
    const { service, invoiceRepository } = createService({
      invoiceRows: [postedSource()],
    });

    await service.createInvoiceRevision(WORKSPACE_ID, SOURCE_ID);

    const savedInvoice = invoiceRepository.save.mock.calls[0][0] as Row;

    expect(savedInvoice.opportunityId).toBeNull();
  });

  // «исправление исправления»: amending a revision points amendedFrom at the
  // LATEST document you called the tool on, not the original — and the
  // number keeps chaining (N+1), not resetting.
  it('chains revision-of-revision: amendedFrom points at the immediate predecessor, revisionNumber = predecessor + 1', async () => {
    const { service, invoiceRepository } = createService({
      invoiceRows: [postedSource()],
    });

    const firstRevision = await service.createInvoiceRevision(
      WORKSPACE_ID,
      SOURCE_ID,
    );

    expect(firstRevision.revisionNumber).toBe(1);

    // The chain-of-revision scenario requires the first revision to itself
    // be POSTED before it can be amended again (ruling: only POSTED sources
    // may be amended) — flip it directly in the fake store.
    const firstRevisionRow = invoiceRepository._rows.find(
      (row) => row.id === firstRevision.id,
    );

    if (firstRevisionRow) {
      firstRevisionRow.docStatus = 'POSTED';
    }

    const secondRevision = await service.createInvoiceRevision(
      WORKSPACE_ID,
      firstRevision.id,
    );

    expect(secondRevision.sourceId).toBe(firstRevision.id);
    expect(secondRevision.revisionNumber).toBe(2);

    const savedSecondInvoice = invoiceRepository.save.mock.calls[1][0] as Row;

    expect(savedSecondInvoice.amendedFromId).toBe(firstRevision.id);
    expect(savedSecondInvoice.amendedFromId).not.toBe(SOURCE_ID);
  });
});
