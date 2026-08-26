import { z } from 'zod';

import { PRINT_DOCUMENT_TYPES } from 'src/engine/core-modules/erp/constants/print-document-type.const';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';

export const UPDATE_PRINT_TEMPLATE_TOOL_NAME = 'update_print_template';

export const updatePrintTemplateInputSchema = z.object({
  documentType: z
    .enum(PRINT_DOCUMENT_TYPES)
    .describe('SCHET (Счёт на оплату) or UPD (УПД)'),
  html: z
    .string()
    .min(1)
    .describe(
      'Full HTML template: {{placeholder}} tags plus a <!-- BEGIN line -->…<!-- END line --> block for the item rows. Use get_print_template first to see the current template and its supported placeholder names.',
    ),
});

export type UpdatePrintTemplateResult = {
  success: boolean;
  id: string;
  message: string;
};

export const createUpdatePrintTemplateTool = (
  printTemplateService: PrintTemplateService,
  workspaceId: string,
  assertCanUpdateObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Set the active print template override for a document type (SCHET/УПД): creates or updates the workspace printTemplate record so it renders instead of the built-in one. Check the result with render_print_preview afterwards.',
  inputSchema: updatePrintTemplateInputSchema,
  execute: async ({
    documentType,
    html,
  }: z.infer<
    typeof updatePrintTemplateInputSchema
  >): Promise<UpdatePrintTemplateResult> => {
    await assertCanUpdateObjectRecords('printTemplate');

    const { id } = await printTemplateService.createOrUpdateActiveTemplate(
      workspaceId,
      documentType,
      html,
    );

    return {
      success: true,
      id,
      message: `Шаблон печати для ${documentType} обновлён и активирован (printTemplate/${id}).`,
    };
  },
});
