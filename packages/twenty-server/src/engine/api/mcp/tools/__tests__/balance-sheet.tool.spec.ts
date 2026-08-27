import { ForbiddenException } from '@nestjs/common';

import { createBalanceSheetTool } from 'src/engine/api/mcp/tools/balance-sheet.tool';
import { type BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildBalanceSheetService = () =>
  ({
    getBalanceSheetData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7728168971',
      organizationKpp: '772801001',
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: [
        {
          code: '1250',
          label: 'Денежные средства и денежные эквиваленты',
          group: 'ASSET',
          currentKopecks: 622_000,
          previousKopecks: 0,
        },
      ],
      totals: {
        assetsCurrentKopecks: 622_000,
        assetsPreviousKopecks: 0,
        liabilitiesCurrentKopecks: 622_000,
        liabilitiesPreviousKopecks: 0,
      },
    }),
  }) as unknown as BalanceSheetService;

describe('createBalanceSheetTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on glEntry', async () => {
    const balanceSheetService = buildBalanceSheetService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createBalanceSheetTool(
      balanceSheetService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({ organizationId: ORGANIZATION_ID, date: '2026-08-31' }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('glEntry');
    expect(balanceSheetService.getBalanceSheetData).not.toHaveBeenCalled();
  });

  it('maps lines/totals to the spec JSON shape (kopecks, current/previousYearEnd)', async () => {
    const balanceSheetService = buildBalanceSheetService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createBalanceSheetTool(
      balanceSheetService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      organizationId: ORGANIZATION_ID,
      date: '2026-08-31',
    });

    expect(balanceSheetService.getBalanceSheetData).toHaveBeenCalledWith(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-31',
    );
    expect(result).toEqual({
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: [
        {
          code: '1250',
          label: 'Денежные средства и денежные эквиваленты',
          group: 'ASSET',
          current: 622_000,
          previousYearEnd: 0,
        },
      ],
      totalAssets: { current: 622_000, previousYearEnd: 0 },
      totalLiabilities: { current: 622_000, previousYearEnd: 0 },
    });
  });
});
