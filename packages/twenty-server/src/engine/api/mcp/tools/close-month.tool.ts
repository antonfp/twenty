import { z } from 'zod';

import {
  type MonthCloseResult,
  type MonthCloseService,
} from 'src/engine/core-modules/erp-accounting/services/month-close.service';

export const CLOSE_MONTH_TOOL_NAME = 'close_month';

export const closeMonthInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Organization id to close the month for'),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .describe('Month to close, format "YYYY-MM", e.g. "2026-08"'),
  isYearReformation: z
    .boolean()
    .optional()
    .describe(
      'Реформация года: additionally zeroes 90.x/91.x subaccounts and closes 99 into 84 — only valid for month "YYYY-12"',
    ),
});

export const createCloseMonthTool = (
  monthCloseService: MonthCloseService,
  workspaceId: string,
  // Same permission as post_document: closing a month writes the document's
  // own records (and its glEntry), so it requires the same permission as
  // updating monthClose records directly.
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Close (закрыть) an accounting month in one call: creates the monthClose document for the organization/month and posts it immediately, writing Дт/Кт 90.09↔99 (and 91.09↔99) from that month\'s glEntry turnover. Fails if the month is already closed, in the future, or has no glEntry turnover. Pass isYearReformation=true only for month "YYYY-12" to additionally zero the 90.x/91.x subaccounts and close 99 into 84 (годовая реформация).',
  inputSchema: closeMonthInputSchema,
  execute: async ({
    organizationId,
    month,
    isYearReformation,
  }: z.infer<typeof closeMonthInputSchema>): Promise<MonthCloseResult> => {
    await assertCanUpdateObjectRecords('monthClose');

    return monthCloseService.closeMonth(
      workspaceId,
      organizationId,
      month,
      isYearReformation ?? false,
    );
  },
});
