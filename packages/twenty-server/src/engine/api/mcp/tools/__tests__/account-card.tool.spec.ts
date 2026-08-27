import { ForbiddenException } from '@nestjs/common';

import { createAccountCardTool } from 'src/engine/api/mcp/tools/account-card.tool';
import { type AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildAccountCardService = () =>
  ({
    getAccountCardData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      accountCode: '51',
      accountName: 'Расчётные счета',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      openingBalanceDebitKopecks: 0,
      openingBalanceCreditKopecks: 0,
      rows: [
        {
          glEntryId: 'gl-1',
          date: '2026-08-25',
          correspondingAccountId: 'account-62',
          debitKopecks: 122000,
          creditKopecks: 0,
          runningBalanceDebitKopecks: 122000,
          runningBalanceCreditKopecks: 0,
          voucherType: 'payment',
          voucherId: 'payment-1',
          correspondingAccountCode: '62.01',
          documentLabel: 'Поступление оплаты № PAY-000001',
        },
      ],
      closingBalanceDebitKopecks: 122000,
      closingBalanceCreditKopecks: 0,
      totalDebitKopecks: 122000,
      totalCreditKopecks: 0,
    }),
  }) as unknown as AccountCardService;

describe('createAccountCardTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on glEntry', async () => {
    const accountCardService = buildAccountCardService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createAccountCardTool(
      accountCardService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({
        organizationId: ORGANIZATION_ID,
        accountCode: '51',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('glEntry');
    expect(accountCardService.getAccountCardData).not.toHaveBeenCalled();
  });

  it('maps opening/rows/closing to the spec JSON shape (kopecks)', async () => {
    const accountCardService = buildAccountCardService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createAccountCardTool(
      accountCardService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      organizationId: ORGANIZATION_ID,
      accountCode: '51',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });

    expect(accountCardService.getAccountCardData).toHaveBeenCalledWith(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      '51',
      '2026-08-01',
      '2026-08-31',
    );
    expect(result).toEqual({
      accountCode: '51',
      accountName: 'Расчётные счета',
      openingBalanceDebit: 0,
      openingBalanceCredit: 0,
      rows: [
        {
          date: '2026-08-25',
          voucherType: 'payment',
          documentLabel: 'Поступление оплаты № PAY-000001',
          correspondingAccountCode: '62.01',
          debit: 122000,
          credit: 0,
          balanceDebit: 122000,
          balanceCredit: 0,
        },
      ],
      closingBalanceDebit: 122000,
      closingBalanceCredit: 0,
      totalDebit: 122000,
      totalCredit: 0,
    });
  });
});
