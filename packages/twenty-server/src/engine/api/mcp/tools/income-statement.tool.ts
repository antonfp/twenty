import { z } from 'zod';

import { type IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';

export const INCOME_STATEMENT_TOOL_NAME = 'income_statement';

export const incomeStatementInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Organization id (ОФР — по одной организации)'),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period start date, inclusive, YYYY-MM-DD'),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Period end date, inclusive, YYYY-MM-DD'),
});

export type IncomeStatementToolLine = {
  code: string;
  label: string;
  current: number;
  previousYear: number;
};

export type IncomeStatementToolResult = {
  dateFrom: string;
  dateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  lines: IncomeStatementToolLine[];
};

export const createIncomeStatementTool = (
  incomeStatementService: IncomeStatementService,
  workspaceId: string,
  // Same permission as the REST print endpoint and trial_balance/balance_sheet:
  // reading the ОФР only reads glEntry, so it requires canReadObjectRecords
  // on that object.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Отчёт о финансовых результатах (упрощённая форма, ФСБУ 4/2023, Приложение № 9): выручка/расходы/прибыль за период и за тот же период предыдущего года, все суммы в копейках (1 рубль = 100 копеек), без округления до тыс.руб. Читает обороты строго по субсчетам 90.01.1/90.02.1/90.03/91.01/91.02 — НЕ включает 90.09/91.09/99 (регламентные проводки закрытия месяца). / Simplified Russian income statement (ФСБУ 4/2023): revenue/expenses/profit for the period and the same period a year earlier, amounts in kopecks, unrounded. Reads only the explicit 90.01.1/90.02.1/90.03/91.01/91.02 subaccounts — never 90.09/91.09/99 (month-end closing transfer accounts).',
  inputSchema: incomeStatementInputSchema,
  execute: async ({
    organizationId,
    dateFrom,
    dateTo,
  }: z.infer<
    typeof incomeStatementInputSchema
  >): Promise<IncomeStatementToolResult> => {
    await assertCanReadObjectRecords('glEntry');

    const {
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
      previousDateFrom,
      previousDateTo,
      lines,
    } = await incomeStatementService.getIncomeStatementData(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
    );

    return {
      dateFrom: resolvedDateFrom,
      dateTo: resolvedDateTo,
      previousDateFrom,
      previousDateTo,
      lines: lines.map((line) => ({
        code: line.code,
        label: line.label,
        current: line.currentKopecks,
        previousYear: line.previousKopecks,
      })),
    };
  },
});
