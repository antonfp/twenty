import { z } from 'zod';

import {
  type BankStatementImportReport,
  type BankStatementImportService,
} from 'src/engine/core-modules/erp-accounting/services/bank-statement-import.service';

export const IMPORT_BANK_STATEMENT_TOOL_NAME = 'import_bank_statement';

export const importBankStatementInputSchema = z.object({
  organizationId: z
    .string()
    .uuid()
    .describe('Our organization id — its ИНН decides payment direction for each row'),
  text: z
    .string()
    .min(1)
    .describe(
      'Full text content of a 1CClientBankExchange (kl_to_1c.txt) bank statement file',
    ),
});

export const createImportBankStatementTool = (
  bankStatementImportService: BankStatementImportService,
  workspaceId: string,
  // Same permission as post_document/cancel_document: importing creates
  // payment/supplierPayment records, so both objects' update permission is
  // required upfront — see bank-statement-import.controller.ts.
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Import a 1CClientBankExchange bank statement (kl_to_1c.txt): creates DRAFT payment/supplierPayment documents per Платёжное поручение row, based on which party (плательщик/получатель) matches the organization ИНН. Idempotent — a re-import skips rows already imported (same number, date, amount, counterparty). Never posts the created documents.',
  inputSchema: importBankStatementInputSchema,
  execute: async ({
    organizationId,
    text,
  }: z.infer<
    typeof importBankStatementInputSchema
  >): Promise<BankStatementImportReport> => {
    await assertCanUpdateObjectRecords('payment');
    await assertCanUpdateObjectRecords('supplierPayment');

    return bankStatementImportService.importStatement(
      workspaceId,
      organizationId,
      text,
    );
  },
});
