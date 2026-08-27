import { ForbiddenException } from '@nestjs/common';

import { createIncomeStatementTool } from 'src/engine/api/mcp/tools/income-statement.tool';
import { type IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildIncomeStatementService = () =>
  ({
    getIncomeStatementData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7728168971',
      organizationKpp: '772801001',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines: [
        {
          code: '2110',
          label: 'Выручка',
          currentKopecks: 100_000,
          previousKopecks: 0,
        },
        {
          code: '2300',
          label: 'Прибыль (убыток) до налогообложения',
          currentKopecks: 60_000,
          previousKopecks: 0,
        },
      ],
    }),
  }) as unknown as IncomeStatementService;

describe('createIncomeStatementTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on glEntry', async () => {
    const incomeStatementService = buildIncomeStatementService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createIncomeStatementTool(
      incomeStatementService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({
        organizationId: ORGANIZATION_ID,
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('glEntry');
    expect(
      incomeStatementService.getIncomeStatementData,
    ).not.toHaveBeenCalled();
  });

  it('maps lines to the spec JSON shape (kopecks, current/previousYear)', async () => {
    const incomeStatementService = buildIncomeStatementService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createIncomeStatementTool(
      incomeStatementService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      organizationId: ORGANIZATION_ID,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });

    expect(incomeStatementService.getIncomeStatementData).toHaveBeenCalledWith(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );
    expect(result).toEqual({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines: [
        { code: '2110', label: 'Выручка', current: 100_000, previousYear: 0 },
        {
          code: '2300',
          label: 'Прибыль (убыток) до налогообложения',
          current: 60_000,
          previousYear: 0,
        },
      ],
    });
  });
});
