import { CommonQueryRunnerException } from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const LINE_OBJECT_NAME = 'salesInvoiceLine';
const PARENT_FIELD_NAME = 'salesInvoiceId';
const PARENT_OBJECT_NAME = 'salesInvoice';
const PARENT_ID = 'invoice-1';
const LINE_ID = 'line-1';

type FakeRepository = { findBy: jest.Mock };

const createFakeRepository = (
  records: Record<string, unknown>[],
): FakeRepository => ({
  findBy: jest.fn().mockResolvedValue(records),
});

const createService = (
  repositoriesByObjectName: Record<string, FakeRepository>,
) => {
  const getRepository = jest.fn((_workspaceId: string, objectName: string) => {
    const repository = repositoriesByObjectName[objectName];

    if (!repository) {
      throw new Error(`No fake repository registered for "${objectName}"`);
    }

    return Promise.resolve(repository);
  });
  const executeInWorkspaceContext = jest.fn((fn: () => unknown) => fn());

  const fakeOrmManager = {
    executeInWorkspaceContext,
    getRepository,
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new ErpDocumentLineGuardService(fakeOrmManager),
    getRepository,
  };
};

const baseArgs = {
  workspaceId: WORKSPACE_ID,
  lineObjectNameSingular: LINE_OBJECT_NAME,
  parentFieldName: PARENT_FIELD_NAME,
  parentObjectNameSingular: PARENT_OBJECT_NAME,
} as const;

describe('ErpDocumentLineGuardService', () => {
  describe('createOne', () => {
    it('allows creating a line for a DRAFT parent', async () => {
      const { service } = createService({
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'DRAFT' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'createOne',
          payload: { data: { [PARENT_FIELD_NAME]: PARENT_ID } },
        }),
      ).resolves.toBeUndefined();
    });

    it('blocks creating a line for a POSTED parent', async () => {
      const { service } = createService({
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'POSTED' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'createOne',
          payload: { data: { [PARENT_FIELD_NAME]: PARENT_ID } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('allows creating a line without a parent', async () => {
      const { service, getRepository } = createService({});

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'createOne',
          payload: { data: { name: 'Free-standing line' } },
        }),
      ).resolves.toBeUndefined();
      expect(getRepository).not.toHaveBeenCalled();
    });
  });

  describe('updateOne', () => {
    it('blocks updating a line whose parent (loaded from DB) is POSTED', async () => {
      const { service } = createService({
        [LINE_OBJECT_NAME]: createFakeRepository([
          { id: LINE_ID, [PARENT_FIELD_NAME]: PARENT_ID },
        ]),
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'POSTED' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'updateOne',
          payload: { id: LINE_ID, data: { quantity: 5 } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('allows updating a line whose parent is DRAFT', async () => {
      const { service } = createService({
        [LINE_OBJECT_NAME]: createFakeRepository([
          { id: LINE_ID, [PARENT_FIELD_NAME]: PARENT_ID },
        ]),
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'DRAFT' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'updateOne',
          payload: { id: LINE_ID, data: { quantity: 5 } },
        }),
      ).resolves.toBeUndefined();
    });

    it('allows updating a line with no parent (id null)', async () => {
      const { service } = createService({
        [LINE_OBJECT_NAME]: createFakeRepository([
          { id: LINE_ID, [PARENT_FIELD_NAME]: null },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'updateOne',
          payload: { id: LINE_ID, data: { quantity: 5 } },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('bulk operations', () => {
    it('fails closed when an updateMany filter is not bounded by ids', async () => {
      const { service } = createService({});

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'updateMany',
          payload: {
            filter: { quantity: { gt: 0 } },
            data: { quantity: 1 },
          },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('blocks deleteMany when a matched line resolves to a POSTED parent', async () => {
      const { service } = createService({
        [LINE_OBJECT_NAME]: createFakeRepository([
          { id: LINE_ID, [PARENT_FIELD_NAME]: PARENT_ID },
        ]),
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'POSTED' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'deleteMany',
          payload: { filter: { id: { in: [LINE_ID] } } },
        }),
      ).rejects.toThrow(CommonQueryRunnerException);
    });

    it('allows deleteMany when matched lines resolve to DRAFT parents', async () => {
      const { service } = createService({
        [LINE_OBJECT_NAME]: createFakeRepository([
          { id: LINE_ID, [PARENT_FIELD_NAME]: PARENT_ID },
        ]),
        [PARENT_OBJECT_NAME]: createFakeRepository([
          { id: PARENT_ID, docStatus: 'DRAFT' },
        ]),
      });

      await expect(
        service.assertLineMutationAllowed({
          ...baseArgs,
          operation: 'deleteMany',
          payload: { filter: { id: { in: [LINE_ID] } } },
        }),
      ).resolves.toBeUndefined();
    });
  });
});
