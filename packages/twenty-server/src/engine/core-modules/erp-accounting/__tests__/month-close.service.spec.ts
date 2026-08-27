// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment — same technique as
// bank-statement-import.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { MonthCloseService } from 'src/engine/core-modules/erp-accounting/services/month-close.service';
import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';

type MonthCloseRow = Record<string, unknown> & { id: string };

// Stateful fake: save() persists, findOne()/findOneByOrFail() read back —
// unlike the stateless canned-response fakes elsewhere, the orphan-reuse
// behavior under test genuinely depends on what a prior save() wrote.
const buildMonthCloseRepository = () => {
  const rows: MonthCloseRow[] = [];

  return {
    findOne: jest.fn(
      async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((row) =>
          Object.entries(where).every(([key, value]) => row[key] === value),
        ) ?? null,
    ),
    findOneByOrFail: jest.fn(async ({ id }: { id: string }) => {
      const row = rows.find((r) => r.id === id);

      if (!row) throw new Error(`not found: ${id}`);

      return row;
    }),
    save: jest.fn(async (row: MonthCloseRow) => {
      rows.push(row);

      return row;
    }),
    _rows: rows,
  };
};

const createService = () => {
  const organizationRepository = {
    findOneBy: jest.fn().mockResolvedValue({ id: ORGANIZATION_ID }),
  };
  const monthCloseRepository = buildMonthCloseRepository();
  const transactionScope: WorkspaceTransactionScope = {
    getRepository: jest.fn((objectName: string) =>
      objectName === 'organization'
        ? organizationRepository
        : monthCloseRepository,
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  };
  const fakeGlobalWorkspaceOrmManager = {
    executeInWorkspaceContext: (fn: () => unknown) => fn(),
    runInWorkspaceTransaction: (
      work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
    ) => work(transactionScope),
  } as unknown as GlobalWorkspaceOrmManager;
  const postingService = {
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn(),
  } as unknown as jest.Mocked<PostingService>;

  return {
    service: new MonthCloseService(
      fakeGlobalWorkspaceOrmManager,
      postingService,
    ),
    organizationRepository,
    monthCloseRepository,
    postingService,
  };
};

describe('MonthCloseService', () => {
  it('rejects an invalid month format', async () => {
    const { service } = createService();

    await expect(
      service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-8', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an unknown organization', async () => {
    const { service, organizationRepository } = createService();

    organizationRepository.findOneBy.mockResolvedValueOnce(null);

    await expect(
      service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-08', false),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a DRAFT dated the last day of the month and posts it', async () => {
    const { service, monthCloseRepository, postingService } = createService();

    const result = await service.closeMonth(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08',
      false,
    );

    expect(result.success).toBe(true);
    expect(monthCloseRepository.save).toHaveBeenCalledTimes(1);
    expect(monthCloseRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        period: '2026-08-01',
        isYearReformation: false,
        postingDate: '2026-08-31',
        docStatus: 'DRAFT',
      }),
    );
    expect(postingService.post).toHaveBeenCalledWith(
      WORKSPACE_ID,
      'monthClose',
      expect.any(String),
    );
  });

  // Review fix-round (Major): create+post are two separate transactions —
  // a failed post() must not leave orphan DRAFTs accumulating on retry.
  it('reuses the orphan DRAFT from a failed close_month instead of creating a duplicate', async () => {
    const { service, monthCloseRepository, postingService } = createService();

    postingService.post.mockRejectedValue(new Error('post failed'));

    await expect(
      service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-08', false),
    ).rejects.toThrow('post failed');
    await expect(
      service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-08', false),
    ).rejects.toThrow('post failed');

    // Exactly one DRAFT ever created — the second call found and reused it.
    expect(monthCloseRepository.save).toHaveBeenCalledTimes(1);
    expect(monthCloseRepository.findOne).toHaveBeenCalledWith({
      where: {
        organizationId: ORGANIZATION_ID,
        period: '2026-08-01',
        isYearReformation: false,
        docStatus: 'DRAFT',
      },
    });

    const [firstCallId] = postingService.post.mock.calls[0].slice(2);
    const [secondCallId] = postingService.post.mock.calls[1].slice(2);

    expect(secondCallId).toBe(firstCallId);
  });

  it('creates a separate DRAFT for a different isYearReformation on the same period', async () => {
    const { service, monthCloseRepository, postingService } = createService();

    postingService.post.mockResolvedValue(undefined);
    await service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-12', false);
    await service.closeMonth(WORKSPACE_ID, ORGANIZATION_ID, '2026-12', true);

    expect(monthCloseRepository.save).toHaveBeenCalledTimes(2);
  });
});
