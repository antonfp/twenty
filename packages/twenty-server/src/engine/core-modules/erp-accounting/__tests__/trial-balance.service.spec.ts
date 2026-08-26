// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment; the service only needs it as
// an injected collaborator, faked below. Same technique as
// erp/__tests__/posting.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';

// 1 kopeck = 10_000 micros (see erp-sales-money.util.ts) — spelled out as a
// helper so the raw-SQL-row fixtures below can't drift from that scale by a
// manual arithmetic slip.
const kopecksToMicrosString = (kopecks: number): string =>
  String(kopecks * 10_000);

type FakeWorkspaceObject = { id: string; nameSingular: string };

const WORKSPACE_OBJECTS: FakeWorkspaceObject[] = [
  { id: 'object-gl-entry', nameSingular: 'glEntry' },
  { id: 'object-account', nameSingular: 'account' },
  { id: 'object-organization', nameSingular: 'organization' },
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

describe('TrialBalanceService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let service: TrialBalanceService;

  beforeEach(() => {
    executeRawQuery = jest.fn().mockResolvedValue([]);
    fakeRepositoryByObjectName = {
      organization: buildFakeRepository(),
      account: buildFakeRepository(),
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

    service = new TrialBalanceService(fakeGlobalWorkspaceOrmManager);
  });

  it('throws NotFoundException when the organization does not exist', async () => {
    await expect(
      service.getTrialBalanceData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('queries the two-legs aggregate with organizationId/dateFrom/dateTo and maps kopecks through the account lookup', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });
    executeRawQuery.mockResolvedValue([
      {
        account_id: 'account-41-01',
        opening_debit_micros: kopecksToMicrosString(30000),
        opening_credit_micros: '0',
        turnover_debit_micros: kopecksToMicrosString(100000),
        turnover_credit_micros: kopecksToMicrosString(40000),
      },
    ]);
    fakeRepositoryByObjectName.account.findBy.mockResolvedValue([
      { id: 'account-41-01', code: '41.01', name: 'Товары на складах', kind: 'ACTIVE' },
    ]);

    const data = await service.getTrialBalanceData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );

    expect(executeRawQuery).toHaveBeenCalledWith(
      expect.stringContaining('GROUP BY account_id'),
      [ORGANIZATION_ID, '2026-08-01', '2026-08-31'],
    );
    expect(fakeRepositoryByObjectName.account.findBy).toHaveBeenCalledWith({
      id: expect.anything(),
    });
    expect(data.organizationName).toBe('ООО «Ромашка»');
    expect(data.rows).toEqual([
      expect.objectContaining({
        code: '41.01',
        name: 'Товары на складах',
        openingDebitKopecks: 30000,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 100000,
        turnoverCreditKopecks: 40000,
        closingDebitKopecks: 90000,
        closingCreditKopecks: 0,
      }),
    ]);
  });

  it('renders HTML with no unresolved placeholders end to end', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });

    const html = await service.renderHtml(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
  });
});
