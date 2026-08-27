import { z } from 'zod';

import { type BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';

export const BALANCE_SHEET_TOOL_NAME = 'balance_sheet';

export const balanceSheetInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Organization id (баланс — по одной организации)'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Report date (сальдо на эту дату включительно), YYYY-MM-DD'),
});

export type BalanceSheetToolLine = {
  code: string;
  label: string;
  group: 'ASSET' | 'LIABILITY';
  current: number;
  previousYearEnd: number;
};

export type BalanceSheetToolResult = {
  reportDate: string;
  previousReportDate: string;
  lines: BalanceSheetToolLine[];
  totalAssets: { current: number; previousYearEnd: number };
  totalLiabilities: { current: number; previousYearEnd: number };
};

export const createBalanceSheetTool = (
  balanceSheetService: BalanceSheetService,
  workspaceId: string,
  // Same permission as the REST print endpoint and trial_balance: reading
  // the баланс only reads glEntry, so it requires canReadObjectRecords on
  // that object — see erp-accounting/controllers/financial-statements.controller.ts.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Бухгалтерский баланс (упрощённая форма, ФСБУ 4/2023, Приложение № 9): активы/капитал/обязательства на отчётную дату и на 31 декабря предыдущего года, все суммы в копейках (1 рубль = 100 копеек), без округления до тыс.руб. — округление только в печатной REST-версии. / Simplified Russian balance sheet (ФСБУ 4/2023): asset/equity/liability line items as of the report date and as of 31 December of the prior year, all amounts in kopecks (1 rouble = 100 kopecks), unrounded — the REST print version rounds to thousands of roubles.',
  inputSchema: balanceSheetInputSchema,
  execute: async ({
    organizationId,
    date,
  }: z.infer<
    typeof balanceSheetInputSchema
  >): Promise<BalanceSheetToolResult> => {
    await assertCanReadObjectRecords('glEntry');

    const { reportDate, previousReportDate, lines, totals } =
      await balanceSheetService.getBalanceSheetData(
        workspaceId,
        organizationId,
        date,
      );

    return {
      reportDate,
      previousReportDate,
      lines: lines.map((line) => ({
        code: line.code,
        label: line.label,
        group: line.group,
        current: line.currentKopecks,
        previousYearEnd: line.previousKopecks,
      })),
      totalAssets: {
        current: totals.assetsCurrentKopecks,
        previousYearEnd: totals.assetsPreviousKopecks,
      },
      totalLiabilities: {
        current: totals.liabilitiesCurrentKopecks,
        previousYearEnd: totals.liabilitiesPreviousKopecks,
      },
    };
  },
});
