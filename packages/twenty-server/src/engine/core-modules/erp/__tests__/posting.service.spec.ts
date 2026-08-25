// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment; the service only needs it as
// an injected collaborator, faked below.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { ERP_POSTING_EXCEPTION_CODE } from 'src/engine/core-modules/erp/erp-posting.exception';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
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

type FakeWorkspaceObject = {
  id: string;
  nameSingular: string;
};

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
  findBy: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
};

const buildFakeRepository = (): FakeRepository => ({
  findOneByOrFail: jest.fn(),
  findBy: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
});

describe('PostingService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let registry: PostingRulesRegistry;
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
    );
  };

  beforeEach(() => {
    executeRawQuery = jest.fn();
    fakeRepositoryByObjectName = {
      salesInvoice: buildFakeRepository(),
      partyLedgerEntry: buildFakeRepository(),
      glEntry: buildFakeRepository(),
    };
    transactionScope = {
      getRepository: jest.fn(
        (objectNameSingular: string) =>
          fakeRepositoryByObjectName[objectNameSingular],
      ),
      executeRawQuery,
    } as unknown as WorkspaceTransactionScope;
    registry = new PostingRulesRegistry();
    postingService = buildPostingService([
      { id: 'object-sales-invoice', nameSingular: 'salesInvoice' },
      { id: 'object-party-ledger', nameSingular: 'partyLedgerEntry' },
      { id: 'object-gl-entry', nameSingular: 'glEntry' },
    ]);
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
      const glEntries = [
        {
          account: '62.01',
          debit: 1500,
          credit: 0,
          voucherType: 'salesInvoice',
          voucherId: RECORD_ID,
          postingDate: '2026-05-10',
        },
        {
          account: '90.01',
          debit: 0,
          credit: 1500,
          voucherType: 'salesInvoice',
          voucherId: RECORD_ID,
          postingDate: '2026-05-10',
        },
      ];

      registry.registerPostingRules('salesInvoice', {
        getPartyEntries: () => [partyEntry],
      });
      registry.registerPostingRules('salesInvoice', {
        getGlEntries: () => glEntries,
      });

      await postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID);

      const [lockSql, lockParameters] = executeRawQuery.mock.calls[0];

      expect(lockSql).toContain('FOR UPDATE');
      expect(lockSql).toContain('"_salesInvoice"');
      expect(lockParameters).toEqual([RECORD_ID]);

      expect(
        fakeRepositoryByObjectName.partyLedgerEntry.insert,
      ).toHaveBeenCalledWith([{ ...SYSTEM_ACTOR_STAMP, ...partyEntry }]);
      expect(fakeRepositoryByObjectName.glEntry.insert).toHaveBeenCalledWith(
        glEntries.map((glEntry) => ({ ...SYSTEM_ACTOR_STAMP, ...glEntry })),
      );
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

    it('rejects unbalanced GL entries and writes nothing', async () => {
      executeRawQuery.mockResolvedValue([
        { id: RECORD_ID, docStatus: DOC_STATUS.DRAFT },
      ]);
      fakeRepositoryByObjectName.salesInvoice.findOneByOrFail.mockResolvedValue(
        { id: RECORD_ID },
      );
      registry.registerPostingRules('salesInvoice', {
        getGlEntries: () => [
          {
            account: '62.01',
            debit: 1000,
            credit: 0,
            voucherType: 'salesInvoice',
            voucherId: RECORD_ID,
            postingDate: '2026-05-10',
          },
        ],
      });

      await expect(
        postingService.post(WORKSPACE_ID, 'salesInvoice', RECORD_ID),
      ).rejects.toMatchObject({
        code: ERP_POSTING_EXCEPTION_CODE.UNBALANCED_GL_ENTRIES,
      });
      expect(fakeRepositoryByObjectName.glEntry.insert).not.toHaveBeenCalled();
      expect(
        fakeRepositoryByObjectName.salesInvoice.update,
      ).not.toHaveBeenCalled();
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

  describe('cancel', () => {
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
