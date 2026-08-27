import { z } from 'zod';

import {
  type ConfirmReconciliationResult,
  type ReconciliationService,
} from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';

export const CONFIRM_RECONCILIATION_TOOL_NAME = 'confirm_reconciliation';

export const confirmReconciliationInputSchema = z.object({
  paymentId: z
    .string()
    .uuid()
    .describe('Id of the payment or supplierPayment record to link'),
  invoiceId: z
    .string()
    .uuid()
    .describe(
      'Id of the salesInvoice or supplierInvoice to link the payment to',
    ),
});

export const createConfirmReconciliationTool = (
  reconciliationService: ReconciliationService,
  workspaceId: string,
  // Confirming writes payment.salesInvoiceId / supplierPayment.supplierInvoiceId
  // — same permission as updating that object's records directly. Checked on
  // both objects upfront (same shape as import_bank_statement) because the
  // tool doesn't know which one paymentId belongs to before it looks it up.
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Подтверждает предложение банковской сверки (reconcile_payments): привязывает платёж (payment/supplierPayment) к счёту (salesInvoice/supplierInvoice), проставляя связь. Не проводит платёж — проведение остаётся отдельным шагом (post_document). Идемпотентен: повторное подтверждение той же пары платёж/счёт — успех без изменений. Смена привязки уже привязанного платежа на другой счёт отклоняется — сначала отвяжите вручную.',
  inputSchema: confirmReconciliationInputSchema,
  execute: async ({
    paymentId,
    invoiceId,
  }: z.infer<
    typeof confirmReconciliationInputSchema
  >): Promise<ConfirmReconciliationResult> => {
    await assertCanUpdateObjectRecords('payment');
    await assertCanUpdateObjectRecords('supplierPayment');

    return reconciliationService.confirmReconciliation(
      workspaceId,
      paymentId,
      invoiceId,
    );
  },
});
