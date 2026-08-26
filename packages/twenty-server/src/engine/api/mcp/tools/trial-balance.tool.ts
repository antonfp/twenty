import { z } from 'zod';

import { type TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';

export const TRIAL_BALANCE_TOOL_NAME = 'trial_balance';

export const trialBalanceInputSchema = z.object({
  organizationId: z.string().uuid().describe('Organization id (ОСВ is scoped to one organization)'),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period start date, inclusive, YYYY-MM-DD'),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period end date, inclusive, YYYY-MM-DD'),
});

export type TrialBalanceToolRow = {
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  closingDebit: number;
  closingCredit: number;
};

export type TrialBalanceToolResult = {
  rows: TrialBalanceToolRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    turnoverDebit: number;
    turnoverCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
};

export const createTrialBalanceTool = (
  trialBalanceService: TrialBalanceService,
  workspaceId: string,
  // Same permission as the REST print endpoint: reading the ОСВ only reads
  // glEntry, so it requires canReadObjectRecords on that object, not
  // canUpdateObjectRecords — see erp-accounting/controllers/trial-balance.controller.ts.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Оборотно-сальдовая ведомость (ОСВ): opening/turnover/closing balances per account for an organization and period, all amounts in kopecks (1 rouble = 100 kopecks).',
  inputSchema: trialBalanceInputSchema,
  execute: async ({
    organizationId,
    dateFrom,
    dateTo,
  }: z.infer<typeof trialBalanceInputSchema>): Promise<TrialBalanceToolResult> => {
    await assertCanReadObjectRecords('glEntry');

    const { rows, totals } = await trialBalanceService.getTrialBalanceData(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
    );

    return {
      rows: rows.map((row) => ({
        accountCode: row.code,
        accountName: row.name,
        openingDebit: row.openingDebitKopecks,
        openingCredit: row.openingCreditKopecks,
        turnoverDebit: row.turnoverDebitKopecks,
        turnoverCredit: row.turnoverCreditKopecks,
        closingDebit: row.closingDebitKopecks,
        closingCredit: row.closingCreditKopecks,
      })),
      totals: {
        openingDebit: totals.openingDebitKopecks,
        openingCredit: totals.openingCreditKopecks,
        turnoverDebit: totals.turnoverDebitKopecks,
        turnoverCredit: totals.turnoverCreditKopecks,
        closingDebit: totals.closingDebitKopecks,
        closingCredit: totals.closingCreditKopecks,
      },
    };
  },
});
