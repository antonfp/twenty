import { z } from 'zod';

import {
  type CreateInvoiceFromOpportunityResult,
  type CreateInvoiceFromOpportunityService,
} from 'src/engine/core-modules/erp-sales/services/create-invoice-from-opportunity.service';

export const CREATE_INVOICE_FROM_OPPORTUNITY_TOOL_NAME =
  'create_invoice_from_opportunity';

export const createInvoiceFromOpportunityInputSchema = z.object({
  opportunityId: z
    .string()
    .uuid()
    .describe('Id of the CRM opportunity to create a DRAFT salesInvoice from'),
});

export const createCreateInvoiceFromOpportunityTool = (
  createInvoiceFromOpportunityService: CreateInvoiceFromOpportunityService,
  workspaceId: string,
  // Writes a new salesInvoice (+ line) — same permission as updating
  // salesInvoice records directly (matches create_invoice_revision).
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Создаёт DRAFT salesInvoice из сделки CRM (opportunity): покупатель = компания сделки (отказ, если у сделки не указана компания), организация = основная (isDefault=true; если нет — первая по дате создания; отказ, если организаций нет вообще), одна строка «Услуги по сделке "<name>"» на всю сумму сделки (переведённую из её валюты в копейки), ставка НДС по умолчанию 22%. Идемпотентно: если у сделки уже есть непроведённый (DRAFT) счёт — возвращает его, а не создаёт второй; после проведения или отмены этого счёта следующий вызов создаёт новый (сделку легально закрывают несколькими счетами — например, частичная оплата).',
  inputSchema: createInvoiceFromOpportunityInputSchema,
  execute: async ({
    opportunityId,
  }: z.infer<
    typeof createInvoiceFromOpportunityInputSchema
  >): Promise<CreateInvoiceFromOpportunityResult> => {
    await assertCanUpdateObjectRecords('salesInvoice');

    return createInvoiceFromOpportunityService.createInvoiceFromOpportunity(
      workspaceId,
      opportunityId,
    );
  },
});
