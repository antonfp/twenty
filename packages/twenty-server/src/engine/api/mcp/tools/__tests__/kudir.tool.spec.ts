import { ForbiddenException } from '@nestjs/common';

import { createKudirTool } from 'src/engine/api/mcp/tools/kudir.tool';
import { type KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildKudirService = () =>
  ({
    getKudirData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [
        {
          seq: 1,
          date: '2026-01-15',
          documentLabel: 'Поступление оплаты № PAY-000001 от 15.01.2026',
          content: 'Оплата по счёту № SI-000001 от 10.01.2026, ООО Ромашка',
          incomeKopecks: 122000,
          expenseKopecks: 0,
        },
        {
          seq: null,
          date: null,
          documentLabel: null,
          content: 'Итого за I квартал',
          incomeKopecks: 122000,
          expenseKopecks: 0,
        },
      ],
      totalIncomeKopecks: 122000,
      totalExpenseKopecks: 0,
    }),
  }) as unknown as KudirService;

describe('createKudirTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on payment', async () => {
    const kudirService = buildKudirService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createKudirTool(
      kudirService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({ organizationId: ORGANIZATION_ID, year: 2026 }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('payment');
    expect(kudirService.getKudirData).not.toHaveBeenCalled();
  });

  it('maps КУДиР data to the spec JSON shape (kopecks)', async () => {
    const kudirService = buildKudirService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createKudirTool(
      kudirService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      organizationId: ORGANIZATION_ID,
      year: 2026,
    });

    expect(kudirService.getKudirData).toHaveBeenCalledWith(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      2026,
    );
    expect(result).toEqual({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [
        {
          seq: 1,
          date: '2026-01-15',
          documentLabel: 'Поступление оплаты № PAY-000001 от 15.01.2026',
          content: 'Оплата по счёту № SI-000001 от 10.01.2026, ООО Ромашка',
          income: 122000,
          expense: 0,
        },
        {
          seq: null,
          date: null,
          documentLabel: null,
          content: 'Итого за I квартал',
          income: 122000,
          expense: 0,
        },
      ],
      totalIncome: 122000,
      totalExpense: 0,
    });
  });
});
