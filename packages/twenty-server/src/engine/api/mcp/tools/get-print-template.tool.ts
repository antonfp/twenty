import { z } from 'zod';

import { PRINT_DOCUMENT_TYPES } from 'src/engine/core-modules/erp/constants/print-document-type.const';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import {
  PRINT_DOCUMENT_BUILT_IN_TEMPLATE,
  PRINT_DOCUMENT_KNOWN_PLACEHOLDERS,
} from 'src/engine/api/mcp/tools/print-document-registry.const';

export const GET_PRINT_TEMPLATE_TOOL_NAME = 'get_print_template';

export const getPrintTemplateInputSchema = z.object({
  documentType: z
    .enum(PRINT_DOCUMENT_TYPES)
    .describe('SCHET (Счёт на оплату) or UPD (УПД)'),
});

export type GetPrintTemplateResult = {
  documentType: (typeof PRINT_DOCUMENT_TYPES)[number];
  source: 'custom' | 'built-in';
  templateHtml: string;
  fallbackReason: string | null;
  availablePlaceholders: string[];
};

export const createGetPrintTemplateTool = (
  printTemplateService: PrintTemplateService,
  workspaceId: string,
  // Reading a print template's content/placeholders only reads the
  // printTemplate object, not the document being printed.
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Get the print template currently in effect for an ERP document type (SCHET/УПД): a workspace override if one is active and valid, otherwise the built-in one — plus the {{placeholder}} names it supports.',
  inputSchema: getPrintTemplateInputSchema,
  execute: async ({
    documentType,
  }: z.infer<
    typeof getPrintTemplateInputSchema
  >): Promise<GetPrintTemplateResult> => {
    await assertCanReadObjectRecords('printTemplate');

    const activeOverride = await printTemplateService.findActiveTemplate(
      workspaceId,
      documentType,
    );
    const { html, source, fallbackReason } =
      printTemplateService.resolveTemplateHtml(
        activeOverride,
        PRINT_DOCUMENT_BUILT_IN_TEMPLATE[documentType],
      );

    return {
      documentType,
      source,
      templateHtml: html,
      fallbackReason,
      availablePlaceholders: [
        ...PRINT_DOCUMENT_KNOWN_PLACEHOLDERS[documentType],
      ],
    };
  },
});
