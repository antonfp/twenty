jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { INCOME_STATEMENT_ACCOUNT_CODES } from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';
import { IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';

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

describe('IncomeStatementService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let service: IncomeStatementService;

  beforeEach(() => {
    executeRawQuery = jest.fn().mockResolvedValue([]);
    fakeRepositoryByObjectName = {
      organization: buildFakeRepository(),
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

    service = new IncomeStatementService(fakeGlobalWorkspaceOrmManager);
  });

  it('throws NotFoundException when the organization does not exist', async () => {
    await expect(
      service.getIncomeStatementData(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('queries turnovers twice (current period, same period a year back) restricted to the explicit account-code allow-list', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
      inn: '7728168971',
      kpp: '772801001',
    });
    executeRawQuery
      .mockResolvedValueOnce([
        {
          account_code: '90.01.1',
          turnover_debit_micros: '0',
          turnover_credit_micros: kopecksToMicrosString(122_000),
        },
        {
          account_code: '90.03',
          turnover_debit_micros: kopecksToMicrosString(22_000),
          turnover_credit_micros: '0',
        },
      ])
      .mockResolvedValueOnce([]);

    const data = await service.getIncomeStatementData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );

    expect(executeRawQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('GROUP BY account_code'),
      [
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
        INCOME_STATEMENT_ACCOUNT_CODES,
      ],
    );
    expect(executeRawQuery).toHaveBeenNthCalledWith(2, expect.any(String), [
      ORGANIZATION_ID,
      '2025-08-01',
      '2025-08-31',
      INCOME_STATEMENT_ACCOUNT_CODES,
    ]);
    expect(data.organizationName).toBe('ООО «Ромашка»');
    expect(data.previousDateFrom).toBe('2025-08-01');
    expect(data.previousDateTo).toBe('2025-08-31');

    const revenue = data.lines.find((line) => line.code === '2110');

    expect(revenue?.currentKopecks).toBe(100_000);
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
