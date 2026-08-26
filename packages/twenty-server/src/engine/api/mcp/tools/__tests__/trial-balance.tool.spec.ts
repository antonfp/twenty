import { ForbiddenException } from '@nestjs/common';

import { createTrialBalanceTool } from 'src/engine/api/mcp/tools/trial-balance.tool';
import { type TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildTrialBalanceService = () =>
  ({
    getTrialBalanceData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      rows: [
        {
          accountId: 'account-1',
          code: '41.01',
          name: 'Товары на складах',
          openingDebitKopecks: 30000,
          openingCreditKopecks: 0,
          turnoverDebitKopecks: 100000,
          turnoverCreditKopecks: 40000,
          closingDebitKopecks: 90000,
          closingCreditKopecks: 0,
        },
      ],
      totals: {
        openingDebitKopecks: 30000,
        openingCreditKopecks: 30000,
        turnoverDebitKopecks: 100000,
        turnoverCreditKopecks: 100000,
        closingDebitKopecks: 90000,
        closingCreditKopecks: 90000,
      },
    }),
  }) as unknown as TrialBalanceService;

describe('createTrialBalanceTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on glEntry', async () => {
    const trialBalanceService = buildTrialBalanceService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createTrialBalanceTool(
      trialBalanceService,
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
    expect(trialBalanceService.getTrialBalanceData).not.toHaveBeenCalled();
  });

  it('maps rows/totals to the spec JSON shape (kopecks, accountCode/accountName)', async () => {
    const trialBalanceService = buildTrialBalanceService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createTrialBalanceTool(
      trialBalanceService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      organizationId: ORGANIZATION_ID,
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });

    expect(trialBalanceService.getTrialBalanceData).toHaveBeenCalledWith(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );
    expect(result).toEqual({
      rows: [
        {
          accountCode: '41.01',
          accountName: 'Товары на складах',
          openingDebit: 30000,
          openingCredit: 0,
          turnoverDebit: 100000,
          turnoverCredit: 40000,
          closingDebit: 90000,
          closingCredit: 0,
        },
      ],
      totals: {
        openingDebit: 30000,
        openingCredit: 30000,
        turnoverDebit: 100000,
        turnoverCredit: 100000,
        closingDebit: 90000,
        closingCredit: 90000,
      },
    });
  });
});
