import { z } from 'zod';

import { type AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';

export const ACCOUNT_CARD_TOOL_NAME = 'account_card';

export const accountCardInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Organization id (карточка счёта is scoped to one organization)'),
  accountCode: z
    .string()
    .min(1)
    .describe('Account code from план счетов, e.g. "51" or "62.01"'),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period start date, inclusive, YYYY-MM-DD'),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period end date, inclusive, YYYY-MM-DD'),
});

export type AccountCardToolRow = {
  date: string;
  voucherType: string | null;
  documentLabel: string;
  correspondingAccountCode: string;
  debit: number;
  credit: number;
  balanceDebit: number;
  balanceCredit: number;
};

export type AccountCardToolResult = {
  accountCode: string;
  accountName: string;
  openingBalanceDebit: number;
  openingBalanceCredit: number;
  rows: AccountCardToolRow[];
  closingBalanceDebit: number;
  closingBalanceCredit: number;
  totalDebit: number;
  totalCredit: number;
};

export const createAccountCardTool = (
  accountCardService: AccountCardService,
  workspaceId: string,
  // Same permission as the REST print endpoint and trial_balance: reading
  // the карточка счёта only reads glEntry, so canReadObjectRecords on that
  // object — see erp-accounting/controllers/account-card.controller.ts.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Карточка счёта: хронологический список проводок ОДНОГО счёта плана счетов за период, с сальдо на начало/конец периода и сальдо нарастающим итогом по каждой проводке. Все суммы в копейках (1 рубль = 100 копеек).',
  inputSchema: accountCardInputSchema,
  execute: async ({
    organizationId,
    accountCode,
    dateFrom,
    dateTo,
  }: z.infer<
    typeof accountCardInputSchema
  >): Promise<AccountCardToolResult> => {
    await assertCanReadObjectRecords('glEntry');

    const data = await accountCardService.getAccountCardData(
      workspaceId,
      organizationId,
      accountCode,
      dateFrom,
      dateTo,
    );

    return {
      accountCode: data.accountCode,
      accountName: data.accountName,
      openingBalanceDebit: data.openingBalanceDebitKopecks,
      openingBalanceCredit: data.openingBalanceCreditKopecks,
      rows: data.rows.map((row) => ({
        date: row.date,
        voucherType: row.voucherType,
        documentLabel: row.documentLabel,
        correspondingAccountCode: row.correspondingAccountCode,
        debit: row.debitKopecks,
        credit: row.creditKopecks,
        balanceDebit: row.runningBalanceDebitKopecks,
        balanceCredit: row.runningBalanceCreditKopecks,
      })),
      closingBalanceDebit: data.closingBalanceDebitKopecks,
      closingBalanceCredit: data.closingBalanceCreditKopecks,
      totalDebit: data.totalDebitKopecks,
      totalCredit: data.totalCreditKopecks,
    };
  },
});
