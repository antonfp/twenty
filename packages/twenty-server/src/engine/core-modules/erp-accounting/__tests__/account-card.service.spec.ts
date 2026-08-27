// Same collaborator-faking technique as trial-balance.service.spec.ts: the
// real manager transitively imports TypeORM entities/GraphQL DTOs that
// cannot load in a unit-test environment.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';

// 1 kopeck = 10_000 micros — same scale as trial-balance.service.spec.ts.
const kopecksToMicrosString = (kopecks: number): string =>
  String(kopecks * 10_000);

type FakeWorkspaceObject = { id: string; nameSingular: string };

const WORKSPACE_OBJECTS: FakeWorkspaceObject[] = [
  { id: 'object-gl-entry', nameSingular: 'glEntry' },
  { id: 'object-account', nameSingular: 'account' },
  { id: 'object-organization', nameSingular: 'organization' },
  { id: 'object-payment', nameSingular: 'payment' },
];

const buildFakeWorkspaceContext = (): ORMWorkspaceContext => {
  const byUniversalIdentifier: Record<string, unknown> = {};
  const universalIdentifierById: Record<string, string> = {};
  const objectIdByNameSingular: Record<string, string> = {};

  for (const object of WORKSPACE_OBJECTS) {
    const universalIdentifier = `universal-${object.id}`;

    byUniversalIdentifier[universalIdentifier] = {
      id: object.id,
      nameSingular: object.nameSingular,
      namePlural: `${object.nameSingular}s`,
      universalIdentifier,
      applicationUniversalIdentifier: 'erp-application',
      labelSingular:
        object.nameSingular === 'payment'
          ? 'Поступление оплаты'
          : object.nameSingular,
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

type FakeRepository = { findOneBy: jest.Mock; findBy: jest.Mock };

const buildFakeRepository = (): FakeRepository => ({
  findOneBy: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
});

describe('AccountCardService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let service: AccountCardService;

  beforeEach(() => {
    executeRawQuery = jest.fn().mockImplementation((sql: string) => {
      // Two distinct raw queries: opening aggregate (single row, no legs
      // CTE) vs. period legs (has the "legs AS" CTE). Route by SQL shape so
      // each test only has to stub the branch it cares about.
      if (sql.includes('legs AS')) {
        return Promise.resolve([]);
      }

      return Promise.resolve([
        { opening_debit_micros: '0', opening_credit_micros: '0' },
      ]);
    });
    fakeRepositoryByObjectName = {
      organization: buildFakeRepository(),
      account: buildFakeRepository(),
      payment: buildFakeRepository(),
    };
    transactionScope = {
      getRepository: jest.fn(
        (objectNameSingular: string) =>
          fakeRepositoryByObjectName[objectNameSingular],
      ),
      executeRawQuery,
    } as unknown as WorkspaceTransactionScope;

    const fakeContext = buildFakeWorkspaceContext();
    const fakeGlobalWorkspaceOrmManager = {
      executeInWorkspaceContext: (fn: () => unknown) =>
        withWorkspaceContext(fakeContext, fn),
      runInWorkspaceTransaction: (
        work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
      ) => work(transactionScope),
    } as unknown as GlobalWorkspaceOrmManager;

    service = new AccountCardService(fakeGlobalWorkspaceOrmManager);
  });

  it('throws NotFoundException when the organization does not exist', async () => {
    await expect(
      service.getAccountCardData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '51',
        '2026-08-01',
        '2026-08-31',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException("Счёт не найден в плане счетов") for an unknown accountCode', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });
    fakeRepositoryByObjectName.account.findOneBy.mockResolvedValue(null);

    await expect(
      service.getAccountCardData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '99.99',
        '2026-08-01',
        '2026-08-31',
      ),
    ).rejects.toThrow('Счёт не найден в плане счетов');
  });

  it('looks up the account by code (not by id) — план счетов is workspace-global', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });
    fakeRepositoryByObjectName.account.findOneBy.mockResolvedValue({
      id: 'account-51',
      code: '51',
      name: 'Расчётные счета',
      kind: 'ACTIVE',
    });

    await service.getAccountCardData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '51',
      '2026-08-01',
      '2026-08-31',
    );

    expect(fakeRepositoryByObjectName.account.findOneBy).toHaveBeenCalledWith({
      code: '51',
    });
  });

  describe('резолв номера документа', () => {
    beforeEach(() => {
      fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
        id: ORGANIZATION_ID,
        name: 'ООО «Ромашка»',
      });
      fakeRepositoryByObjectName.account.findOneBy.mockResolvedValue({
        id: 'account-51',
        code: '51',
        name: 'Расчётные счета',
        kind: 'ACTIVE',
      });
      fakeRepositoryByObjectName.account.findBy.mockResolvedValue([
        { id: 'account-62', code: '62.01', name: 'Расчёты с покупателями' },
      ]);
      executeRawQuery.mockImplementation((sql: string) => {
        if (sql.includes('legs AS')) {
          return Promise.resolve([
            {
              id: 'gl-1',
              entry_date: '2026-08-25',
              micros: kopecksToMicrosString(122000),
              is_debit: true,
              corr_account_id: 'account-62',
              voucher_type: 'payment',
              voucher_id: 'payment-1',
              created_at: '2026-08-25T10:00:00.000Z',
            },
            {
              id: 'gl-2',
              entry_date: '2026-08-26',
              micros: kopecksToMicrosString(50000),
              is_debit: true,
              corr_account_id: 'account-62',
              voucher_type: 'payment',
              voucher_id: 'payment-deleted',
              created_at: '2026-08-26T10:00:00.000Z',
            },
          ]);
        }

        return Promise.resolve([
          { opening_debit_micros: '0', opening_credit_micros: '0' },
        ]);
      });
    });

    it('resolves an existing voucher to "{labelSingular} № {number}"', async () => {
      fakeRepositoryByObjectName.payment.findBy.mockResolvedValue([
        { id: 'payment-1', number: 'PAY-000001' },
      ]);

      const data = await service.getAccountCardData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '51',
        '2026-08-01',
        '2026-08-31',
      );

      const row = data.rows.find((r) => r.glEntryId === 'gl-1');

      expect(row?.documentLabel).toBe('Поступление оплаты № PAY-000001');
      expect(row?.correspondingAccountCode).toBe('62.01');
    });

    it('falls back to "(удалён) <id>" for a voucherId with no matching record', async () => {
      fakeRepositoryByObjectName.payment.findBy.mockResolvedValue([
        { id: 'payment-1', number: 'PAY-000001' },
        // payment-deleted intentionally absent.
      ]);

      const data = await service.getAccountCardData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '51',
        '2026-08-01',
        '2026-08-31',
      );

      const row = data.rows.find((r) => r.glEntryId === 'gl-2');

      expect(row?.documentLabel).toBe('(удалён) payment-deleted');
    });
  });

  it('renders HTML with no unresolved placeholders end to end, including an empty period', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });
    fakeRepositoryByObjectName.account.findOneBy.mockResolvedValue({
      id: 'account-51',
      code: '51',
      name: 'Расчётные счета',
      kind: 'ACTIVE',
    });

    const html = await service.renderHtml(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '51',
      '2026-08-01',
      '2026-08-31',
    );

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
    expect(html).toContain('51');
    expect(html).toContain('Сальдо на начало периода');
    expect(html).toContain('Сальдо на конец периода');
  });
});
