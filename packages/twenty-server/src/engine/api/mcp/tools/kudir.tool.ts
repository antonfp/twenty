import { z } from 'zod';

import { type KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';

export const KUDIR_TOOL_NAME = 'kudir';

export const kudirInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Organization id (КУДиР is scoped to one organization on УСН)'),
  year: z
    .number()
    .int()
    .min(2000)
    .max(2100)
    .describe('Calendar year for Раздел I, e.g. 2026'),
});

export type KudirToolEntry = {
  seq: number | null;
  date: string | null;
  documentLabel: string | null;
  content: string;
  income: number;
  expense: number;
};

export type KudirToolResult = {
  organizationName: string;
  organizationInn: string;
  taxSystemLabel: string;
  year: number;
  entries: KudirToolEntry[];
  totalIncome: number;
  totalExpense: number;
};

export const createKudirTool = (
  kudirService: KudirService,
  workspaceId: string,
  // Same reasoning as account_card/trial_balance: read permission on the
  // register this report reads (payment — see kudir.controller.ts).
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'КУДиР (Книга учёта доходов и расходов, УСН, раздел I): кассовый метод — доходы по датам ПОСТУПЛЕНИЯ оплаты (не по дате счёта), расходы (только для УСН «доходы минус расходы») — оплаты поставщикам за услуги, и товарные расходы по тройному условию (товар оприходован + оплачен поставщику + реализован покупателю). Только для организаций на УСН — на другой системе налогообложения тул откажет. Все суммы в копейках (1 рубль = 100 копеек), поквартальные накопительные итоги включены в entries (строки с seq=null).',
  inputSchema: kudirInputSchema,
  execute: async ({
    organizationId,
    year,
  }: z.infer<typeof kudirInputSchema>): Promise<KudirToolResult> => {
    await assertCanReadObjectRecords('payment');

    const data = await kudirService.getKudirData(
      workspaceId,
      organizationId,
      year,
    );

    return {
      organizationName: data.organizationName,
      organizationInn: data.organizationInn,
      taxSystemLabel: data.taxSystemLabel,
      year: data.year,
      entries: data.entries.map((entry) => ({
        seq: entry.seq,
        date: entry.date,
        documentLabel: entry.documentLabel,
        content: entry.content,
        income: entry.incomeKopecks,
        expense: entry.expenseKopecks,
      })),
      totalIncome: data.totalIncomeKopecks,
      totalExpense: data.totalExpenseKopecks,
    };
  },
});
