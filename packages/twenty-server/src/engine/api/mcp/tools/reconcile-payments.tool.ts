import { z } from 'zod';

import {
  type ReconciliationProposal,
  type ReconciliationService,
} from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';

export const RECONCILE_PAYMENTS_TOOL_NAME = 'reconcile_payments';

export const reconcilePaymentsInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe(
      'Organization id — сверка ищет непривязанные DRAFT-платежи этой организации',
    ),
});

export const createReconcilePaymentsTool = (
  reconciliationService: ReconciliationService,
  workspaceId: string,
  // Reads payment/supplierPayment (the unmatched documents) and
  // salesInvoice/supplierInvoice (candidate invoices) — same permission
  // shape as import_bank_statement's dual check, extended to all four
  // objects this tool actually reads.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Банковская сверка (bank reconciliation): для непривязанных к счёту DRAFT-платежей организации (входящих payment и исходящих supplierPayment) предлагает счета-кандидаты — POSTED, неоплаченные или частично оплаченные salesInvoice/supplierInvoice — сопоставленные по ИНН контрагента (обязательное условие, без совпадения ИНН счёт не кандидат), сумме относительно остатка к оплате и упоминанию номера счёта в назначении платежа. Каждый кандидат — со скором и текстовым RU-объяснением, отсортированы по скору. Ничего не изменяет — только предложения; для привязки используйте confirm_reconciliation.',
  inputSchema: reconcilePaymentsInputSchema,
  execute: async ({
    organizationId,
  }: z.infer<typeof reconcilePaymentsInputSchema>): Promise<
    ReconciliationProposal[]
  > => {
    await assertCanReadObjectRecords('payment');
    await assertCanReadObjectRecords('supplierPayment');
    await assertCanReadObjectRecords('salesInvoice');
    await assertCanReadObjectRecords('supplierInvoice');

    return reconciliationService.getReconciliationProposals(
      workspaceId,
      organizationId,
    );
  },
});
