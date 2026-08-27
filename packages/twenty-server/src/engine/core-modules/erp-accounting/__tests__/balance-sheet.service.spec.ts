// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment; the service only needs it as
// an injected collaborator, faked below. Same technique as
// trial-balance.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
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

describe('BalanceSheetService', () => {
  let executeRawQuery: jest.Mock;
  let fakeRepositoryByObjectName: Record<string, FakeRepository>;
  let transactionScope: WorkspaceTransactionScope;
  let service: BalanceSheetService;

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

    service = new BalanceSheetService(fakeGlobalWorkspaceOrmManager);
  });

  it('throws NotFoundException when the organization does not exist', async () => {
    await expect(
      service.getBalanceSheetData(WORKSPACE_ID, ORGANIZATION_ID, '2026-08-31'),
    ).rejects.toThrow(NotFoundException);
  });

  it('queries net balances twice (current date, 31.12 prior year) and maps kopecks through the line mapping', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
      inn: '7728168971',
      kpp: '772801001',
    });
    executeRawQuery
      .mockResolvedValueOnce([
        { account_code: '51', net_micros: kopecksToMicrosString(622_000) },
        // Offsetting entry so the fixture is a real (balanced) double-entry
        // snapshot, not an artificial single-account one — otherwise
        // актив=пассив wouldn't hold and the assertion below would be
        // asserting something that can't be true by construction.
        { account_code: '80', net_micros: kopecksToMicrosString(-622_000) },
      ])
      .mockResolvedValueOnce([]);

    const data = await service.getBalanceSheetData(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-31',
    );

    expect(executeRawQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('GROUP BY account_code'),
      [ORGANIZATION_ID, '2026-08-31'],
    );
    expect(executeRawQuery).toHaveBeenNthCalledWith(2, expect.any(String), [
      ORGANIZATION_ID,
      '2025-12-31',
    ]);
    expect(data.organizationName).toBe('ООО «Ромашка»');
    expect(data.organizationInn).toBe('7728168971');
    expect(data.reportDate).toBe('2026-08-31');
    expect(data.previousReportDate).toBe('2025-12-31');

    const line1250 = data.lines.find((line) => line.code === '1250');

    expect(line1250?.currentKopecks).toBe(622_000);
    expect(data.totals.assetsCurrentKopecks).toBe(622_000);
    expect(data.totals.liabilitiesCurrentKopecks).toBe(622_000);
  });

  it('renders HTML with no unresolved placeholders end to end', async () => {
    fakeRepositoryByObjectName.organization.findOneBy.mockResolvedValue({
      id: ORGANIZATION_ID,
      name: 'ООО «Ромашка»',
    });

    const html = await service.renderHtml(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-31',
    );

    expect(html).not.toContain('{{');
    expect(html).toContain('ООО «Ромашка»');
  });
});
