import { z } from 'zod';

import {
  type CreateInvoiceRevisionResult,
  type CreateInvoiceRevisionService,
} from 'src/engine/core-modules/erp-sales/services/create-invoice-revision.service';

export const CREATE_INVOICE_REVISION_TOOL_NAME = 'create_invoice_revision';

export const createInvoiceRevisionInputSchema = z.object({
  invoiceId: z
    .string()
    .uuid()
    .describe('Id of the POSTED salesInvoice to create a correction for'),
});

export const createCreateInvoiceRevisionTool = (
  createInvoiceRevisionService: CreateInvoiceRevisionService,
  workspaceId: string,
  // Writes a new salesInvoice (+ lines) — same permission as updating
  // salesInvoice records directly (matches post_document/close_month).
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Создаёт «Исправление счёта» (исправительный документ, research §4 — не УКД: устраняет техническую ошибку в уже свершившемся факте, сама сделка не меняется) для проведённого (POSTED) salesInvoice: копия шапки (покупатель/организация/комментарий, дата счёта = сегодня) и ВСЕХ строк исходника, тот же номер счёта, новый DRAFT с amendedFrom=источник и revisionNumber=источник+1. Оригинал НЕ трогается и остаётся проведённым — отменить его проведение решает бухгалтер отдельно, когда исправление готово. Отказывает, если счёт ещё DRAFT (черновик правится напрямую) или CANCELLED, а также если у счёта уже есть непроведённое черновое исправление (сначала проведите или удалите его).',
  inputSchema: createInvoiceRevisionInputSchema,
  execute: async ({
    invoiceId,
  }: z.infer<
    typeof createInvoiceRevisionInputSchema
  >): Promise<CreateInvoiceRevisionResult> => {
    await assertCanUpdateObjectRecords('salesInvoice');

    return createInvoiceRevisionService.createInvoiceRevision(
      workspaceId,
      invoiceId,
    );
  },
});
