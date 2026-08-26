// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment; the service only needs it as
// an injected collaborator, faked below.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { ERP_POSTING_EXCEPTION_CODE } from 'src/engine/core-modules/erp/erp-posting.exception';
import { GlContributorRegistry } from 'src/engine/core-modules/erp/gl-contributor.registry';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpGlEntryRow } from 'src/engine/core-modules/erp/types/posting.types';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const SYSTEM_ACTOR_STAMP = {
  createdBy: { source: 'SYSTEM', name: 'ERPilot', context: {} },
  updatedBy: { source: 'SYSTEM', name: 'ERPilot', context: {} },
};

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const RECORD_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';
const ORGANIZATION_ID = '40404040-9f6a-4a83-91d7-63f5b1a2f002';

type FakeWorkspaceObject = {
  id: string;
  nameSingular: string;
};

const DEFAULT_WORKSPACE_OBJECTS: FakeWorkspaceObject[] = [
  { id: 'object-sales-invoice', nameSingular: 'salesInvoice' },
  { id: 'object-party-ledger', nameSingular: 'partyLedgerEntry' },
  { id: 'object-gl-entry', nameSingular: 'glEntry' },
  { id: 'object-organization', nameSingular: 'organization' },
];

const buildFakeWorkspaceContext = (
  objects: FakeWorkspaceObject[],
): ORMWorkspaceContext => {
  const byUniversalIdentifier: Record<string, unknown> = {};
  const universalIdentifierById: Record<string, string> = {};
  const objectIdByNameSingular: Record<string, string> = {};

  for (const object of objects) {
    const universalIdentifier = `universal-${object.id}`;

    byUniversalIdentifier[universalIdentifier] = {
      id: object.id,
      nameSingular: object.nameSingular,
      namePlural: `${object.nameSingular}s`,
      universalIdentifier,
      applicationUniversalIdentifier: 'erp-application',
    };
    universalIdentifierById[object.id] = universalIdentifier;
    objectIdByNameSingular[object.nameSingular] = object.id;
  }

  return {
    authContext: buildSystemAuthContext(WORKSPACE_ID),
    flatObjectMetadataMaps: {
      byUniversalIdentifier,
      universalIdentifierById,
      universalIdentifiersByApplicationId: {},
    },
    objectIdByNameSingular,
  } as unknown as ORMWorkspaceContext;
};

type FakeRepository = {
  findOneByOrFail: jest.Mock;
  findOneBy: jest.Mock;
  findBy: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

const buildFakeRepository = (): FakeRepository => ({
  findOneByOrFail: jest.fn(),
  findOneBy: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
});

describe('PostingService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let registry: PostingRulesRegistry;
  let glContributorRegistry: GlContributorRegistry;
  let postingService: PostingService;

  const buildPostingService = (workspaceObjects: FakeWorkspaceObject[]) => {
    const fakeContext = buildFakeWorkspaceContext(workspaceObjects);
    const fakeGlobalWorkspaceOrmManager = {
      executeInWorkspaceContext: (fn: () => unknown) =>
        withWorkspaceContext(fakeContext, fn),
      runInWorkspaceTransaction: (
        work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
      ) => work(transactionScope),
    } as unknown as GlobalWorkspaceOrmManager;

    return new PostingService(
      fakeGlobalWorkspaceOrmManager,
      registry,
      new PeriodLockService(),
      glContributorRegistry,
    );
  };

  const buildGlEntryRow = (
    overrides: Partial<ErpGlEntryRow> = {},
  ): ErpGlEntryRow => ({
    name: 'Дт 62.01 Кт 90.01.1',
    date: '2026-05-10',
    debitAccountId: 'account-62-01',
    creditAccountId: 'account-90-01-1',
    amount: { amountMicros: 1_220_000_000, currencyCode: 'RUB' },
    organizationId: ORGANIZATION_ID,
    partyId: null,
    itemId: null,
    voucherType: 'salesInvoice',
    voucherId: RECORD_ID,
    isCancelled: false,
    isCancellation: false,
    ...overrides,
  });

  beforeEach(() => {
    executeRawQuery = jest.fn();
    fakeRepositoryByObjectName = {
      salesInvoice: buildFakeRepository(),
      partyLedgerEntry: buildFakeRepository(),
      glEntry: buildFakeRepository(),
      organization: buildFakeRepository(),
    };
    transactionScope = {
      getRepository: jest.fn(
        (objectNameSingular: string) =>
          fakeRepositoryByObjectName[objectNameSingular],
      ),
      executeRawQuery,
    } as unknown as WorkspaceTransactionScope;
    registry = new PostingRulesRegistry();
    glContributorRegistry = new GlContributorRegistry();
    postingService = buildPostingService(DEFAULT_WORKSPACE_OBJECTS);
  });

  describe('post', () => {
    it('locks the row, writes register entries from all providers and marks the document POSTED', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID, postingDate: '2026-05-10' },
      );

      const partyEntry = {
        partyId: 'party-1',
        voucherType: 'salesInvoice',
        voucherId: RECORD_ID,
        direction: 'AR' as const,
        amount: 1500,
        postingDate: '2026-05-10',
      };

      registry.registerPostingRules('salesInvoice', {
        getPartyEntries: () => [partyEntry],
      });

      await postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      const [lockSql, lockParameters] = executeRawQuery.mock.calls[0];

      expect(lockSql).toContain('FOR UPDATE');
      expect(lockSql).toContain('"_salesInvoice"');
      expect(lockParameters).toEqual([RECORD_ID]);

      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.insert,
      ).toHaveBeenCalledWith([{ ...SYSTEM_ACTOR_STAMP, ...partyEntry }]);
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.POSTED,
        postedAt: expect.any(String),
      });
    });

    it('writes GL rows from the registered contributor on a re-read document, in the same transaction', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail
        .mockResolvedValueOnce({ id: RECORD_ID, postingDate: '2026-05-10' })
        .mockResolvedValueOnce({
          id: RECORD_ID,
          postingDate: '2026-05-10',
          total: { amountMicros: 1_220_000_000, currencyCode: 'RUB' },
        });

      registry.registerPostingRules('salesInvoice', {});

      const glEntryRow = buildGlEntryRow();
      const contributor = jest.fn().mockResolvedValue([glEntryRow]);

      glContributorRegistry.registerGlContributor('salesInvoice', contributor);

      await postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      // Contributor sees the document re-read AFTER the main provider wrote
      // totals — the second findOneByOrFail result.
      expect(contributor).toHaveBeenCalledWith(
        expect.objectContaining({
          documentObjectName: 'salesInvoice',
          documentId: RECORD_ID,
        }),
        expect.objectContaining({
          total: { amountMicros: 1_220_000_000, currencyCode: 'RUB' },
        }),
        [],
      );
      expect(fakeRepositoryByObjectName.glEntry.insert).toHaveBeenCalledWith([
        { ...SYSTEM_ACTOR_STAMP, ...glEntryRow },
      ]);
    });

    it('skips the GL contributor silently when the glEntry object is not installed', async () => {
      postingService = buildPostingService(
        DEFAULT_WORKSPACE_OBJECTS.filter(
          (object) => object.nameSingular !== 'glEntry',
        ),
      );

      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID, postingDate: '2026-05-10' },
      );

      registry.registerPostingRules('salesInvoice', {});

      const contributor = jest.fn();

      glContributorRegistry.registerGlContributor('salesInvoice', contributor);

      await postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(contributor).not.toHaveBeenCalled();
      expect(fakeRepositoryByObjectName.glEntry.insert).not.toHaveBeenCalled();
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.POSTED,
        postedAt: expect.any(String),
      });
    });

    it('rejects posting a document that is not DRAFT', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);
      registry.registerPostingRules('salesInvoice', {});

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
      });
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).not.toHaveBeenCalled();
    });

    it('rejects posting when no posting rules are registered', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.NO_POSTING_RULES,
      });
    });

    it('rejects a missing document row', async () => {
      executeRawQuery.mockResolvedValue([]);

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.DOCUMENT_NOT_FOUND,
      });
    });
  });

  describe('lock date', () => {
    beforeEach(() => {
      registry.registerPostingRules('salesInvoice', {});
      fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
        id: ORGANIZATION_ID,
        name: 'ООО «Ромашка»',
        lockDate: '2026-05-10',
      });
    });

    it.each([
      ['before the lock date', '2026-05-09'],
      ['on the lock date (boundary inclusive)', '2026-05-10'],
    ])('rejects posting %s', async (_label, postingDate) => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID, postingDate, organizationId: ORGANIZATION_ID },
      );

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.PERIOD_LOCKED,
      });
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).not.toHaveBeenCalled();
    });

    it('allows posting after the lock date', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        {
          id: RECORD_ID,
          postingDate: '2026-05-11',
          organizationId: ORGANIZATION_ID,
        },
      );

      await postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.POSTED,
        postedAt: expect.any(String),
      });
    });

    it('skips the check for a document without organizationId', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID, postingDate: '2026-05-01' },
      );

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).resolves.toBeUndefined();
    });

    it('rejects cancelling a document posted inside the locked period', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        {
          id: RECORD_ID,
          postingDate: '2026-05-10',
          organizationId: ORGANIZATION_ID,
        },
      );

      await expect(
        postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.PERIOD_LOCKED,
      });
      // Nothing may be reversed when the period is closed.
      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.insert,
      ).not.toHaveBeenCalled();
      expect(fakeRepositoryByObjectName.glEntry.insert).not.toHaveBeenCalled();
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).not.toHaveBeenCalled();
    });

    it('allows cancelling a document posted after the lock date', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        {
          id: RECORD_ID,
          postingDate: '2026-05-11',
          organizationId: ORGANIZATION_ID,
        },
      );

      await postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.CANCELLED,
        cancelledAt: expect.any(String),
      });
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID, postingDate: '2026-05-10' },
      );
    });

    it('writes negated reversal rows, marks originals cancelled and sets the document CANCELLED', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);
      fakeRepositoryByObjectName.partyLedgerEntry.findBy.mockResolvedValue([
        {
          id: 'register-row-1',
          partyId: 'party-1',
          voucherType: 'salesInvoice',
          voucherId: RECORD_ID,
          direction: 'AR',
          amount: 1500,
          isCancellation: false,
          isCancelled: false,
        },
      ]);

      await postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.findBy,
      ).toHaveBeenCalledWith({
        voucherType: 'salesInvoice',
        voucherId: RECORD_ID,
        isCancellation: false,
      });
      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.insert,
      ).toHaveBeenCalledWith([
        {
          partyId: 'party-1',
          voucherType: 'salesInvoice',
          voucherId: RECORD_ID,
          direction: 'AR',
          amount: -1500,
          isCancellation: true,
          isCancelled: false,
        },
      ]);
      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.update,
      ).toHaveBeenCalledWith(['register-row-1'], { isCancelled: true });
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.CANCELLED,
        cancelledAt: expect.any(String),
      });
    });

    it('reverses glEntry rows with the negated CURRENCY amount (сторно проводок)', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);
      fakeRepositoryByObjectName.glEntry.findBy.mockResolvedValue([
        {
          id: 'gl-row-1',
          ...buildGlEntryRow(),
        },
      ]);

      await postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(fakeRepositoryByObjectName.glEntry.findBy).toHaveBeenCalledWith({
        voucherType: 'salesInvoice',
        voucherId: RECORD_ID,
        isCancellation: false,
      });
      expect(fakeRepositoryByObjectName.glEntry.insert).toHaveBeenCalledWith([
        {
          ...buildGlEntryRow({
            amount: { amountMicros: -1_220_000_000, currencyCode: 'RUB' },
          }),
          isCancellation: true,
          isCancelled: false,
        },
      ]);
      expect(fakeRepositoryByObjectName.glEntry.update).toHaveBeenCalledWith(
        ['gl-row-1'],
        { isCancelled: true },
      );
    });

    it('skips glEntry reversal silently when the glEntry object is not installed', async () => {
      postingService = buildPostingService(
        DEFAULT_WORKSPACE_OBJECTS.filter(
          (object) => object.nameSingular !== 'glEntry',
        ),
      );

      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.POSTED },
      ]);

      await postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      expect(fakeRepositoryByObjectName.glEntry.findBy).not.toHaveBeenCalled();
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).toHaveBeenCalledWith(RECORD_ID, {
        docStatus: DOC_STATUS.CANCELLED,
        cancelledAt: expect.any(String),
      });
    });

    it('rejects cancelling a document that is not POSTED', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);

      await expect(
        postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
      });
      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.insert,
      ).not.toHaveBeenCalled();
    });

    it('wraps unexpected errors into POSTING_FAILED', async () => {
      executeRawQuery.mockRejectedValue(new Error('connection lost'));

      await expect(
        postingService.cancel(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
      });
    });
  });
});
