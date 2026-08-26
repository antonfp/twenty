import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const OBJECT_NAME = 'salesInvoice';
const RECORD_ID = 'invoice-1';

type FakeRepository = { find: jest.Mock };

const createFakeRepository = (
  records: Record<string, unknown>[],
): FakeRepository => ({
  find: jest.fn().mockResolvedValue(records),
});

const createService = (records: Record<string, unknown>[] = []) => {
  const repository = createFakeRepository(records);
  const getRepository = jest.fn().mockResolvedValue(repository);
  const executeInWorkspaceContext = jest.fn((fn: () => unknown) => fn());

  const fakeOrmManager = {
    executeInWorkspaceContext,
    getRepository,
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new ErpDocumentGuardService(fakeOrmManager),
    getRepository,
    repository,
  };
};

describe('ErpDocumentGuardService', () => {
  describe('upsert', () => {
    it('rejects createOne with upsert:true', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { docStatus: 'DRAFT' }, upsert: true },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('rejects createMany with upsert:true', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createMany',
          payload: { data: [{ docStatus: 'DRAFT' }], upsert: true },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('allows createOne without upsert', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { docStatus: 'DRAFT' } },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('create', () => {
    it('blocks creating a document with docStatus POSTED', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { docStatus: 'POSTED' } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    // Coordinator fix-round (integrity finding): create must default to DRAFT
    // when docStatus is simply omitted — only an explicit non-DRAFT value is
    // rejected by assertCreateDataIsDraft.
    it('allows createOne with docStatus omitted (defaults to DRAFT)', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { name: 'x' } },
        }),
      ).resolves.toBeUndefined();
    });

    // Task 6 parked minor: the create path guards docStatus and the other
    // POSTING_MANAGED_FIELD_NAMES the same way (touchesPostingManagedField),
    // but only docStatus had a create-path test — postedAt/cancelledAt were
    // only covered on the update path.
    it('blocks createOne with postedAt set', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { postedAt: new Date().toISOString() } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('blocks createOne with cancelledAt set', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'createOne',
          payload: { data: { cancelledAt: new Date().toISOString() } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });
  });

  describe('update', () => {
    it('blocks updateOne on a POSTED document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'POSTED' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateOne',
          payload: { id: RECORD_ID, data: { name: 'x' } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('allows updateOne on a DRAFT document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'DRAFT' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateOne',
          payload: { id: RECORD_ID, data: { name: 'x' } },
        }),
      ).resolves.toBeUndefined();
    });

    // Coordinator fix-round (integrity finding): docStatus/postedAt/cancelledAt
    // are lifecycle fields the posting flow owns — reject a manual write even
    // when the record itself is currently DRAFT (this check runs independently
    // of, and before, the "record must be DRAFT" check above).
    it('blocks updateOne setting docStatus on a currently-DRAFT document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'DRAFT' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateOne',
          payload: { id: RECORD_ID, data: { docStatus: 'POSTED' } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('blocks updateOne setting postedAt manually on a currently-DRAFT document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'DRAFT' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateOne',
          payload: {
            id: RECORD_ID,
            data: { postedAt: new Date().toISOString() },
          },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('blocks updateOne setting cancelledAt manually on a currently-DRAFT document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'DRAFT' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateOne',
          payload: {
            id: RECORD_ID,
            data: { cancelledAt: new Date().toISOString() },
          },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });
  });

  describe('bulk fail-closed', () => {
    it('fails closed on updateMany with an unbounded filter', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'updateMany',
          payload: { filter: { name: { eq: 'x' } }, data: { name: 'y' } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('fails closed on deleteMany with an unbounded filter', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'deleteMany',
          payload: { filter: { name: { eq: 'x' } } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('fails closed on restoreMany with an unbounded filter', async () => {
      const { service } = createService();

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'restoreMany',
          payload: { filter: { name: { eq: 'x' } } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });
  });

  describe('restore/merge', () => {
    it('blocks restoreOne on a POSTED document, looking it up withDeleted', async () => {
      const { service, repository } = createService([
        { id: RECORD_ID, docStatus: 'POSTED' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'restoreOne',
          payload: { id: RECORD_ID },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
    });

    it('allows restoreOne on a DRAFT document', async () => {
      const { service } = createService([
        { id: RECORD_ID, docStatus: 'DRAFT' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'restoreOne',
          payload: { id: RECORD_ID },
        }),
      ).resolves.toBeUndefined();
    });

    it('blocks mergeMany when any affected record is not DRAFT', async () => {
      const { service } = createService([
        { id: 'a', docStatus: 'DRAFT' },
        { id: 'b', docStatus: 'POSTED' },
      ]);

      await expect(
        service.assertDocumentMutationAllowed({
          workspaceId: WORKSPACE_ID,
          objectNameSingular: OBJECT_NAME,
          operation: 'mergeMany',
          payload: { ids: ['a', 'b'], conflictPriorityIndex: 0 },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });
  });
});
