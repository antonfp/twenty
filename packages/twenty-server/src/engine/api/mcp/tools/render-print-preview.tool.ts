import { z } from 'zod';

import {
  PRINT_DOCUMENT_OBJECT_NAME,
  PRINT_DOCUMENT_TYPES,
} from 'src/engine/core-modules/erp/constants/print-document-type.const';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { findUnknownPlaceholderNames } from 'src/engine/core-modules/erp/utils/fill-print-template.util';
import { type SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { type SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import {
  PRINT_DOCUMENT_BUILT_IN_TEMPLATE,
  PRINT_DOCUMENT_KNOWN_PLACEHOLDERS,
} from 'src/engine/api/mcp/tools/print-document-registry.const';

export const RENDER_PRINT_PREVIEW_TOOL_NAME = 'render_print_preview';

export const renderPrintPreviewInputSchema = z.object({
  documentType: z
    .enum(PRINT_DOCUMENT_TYPES)
    .describe('SCHET (Счёт на оплату) or UPD (УПД)'),
  recordId: z
    .string()
    .uuid()
    .describe(
      'Id of the salesInvoice record (SCHET) or salesShipment record (UPD) to render',
    ),
});

export type RenderPrintPreviewResult = {
  html: string;
  source: 'custom' | 'built-in';
  fallbackReason: string | null;
  unfilledPlaceholders: string[];
};

// Default передаточный-документ status matching SalesShipmentPrintController
// (query param omitted -> «2») — render_print_preview's signature is
// documentType/recordId only, no separate УПД status input.
const DEFAULT_UPD_STATUS = '2' as const;

export const createRenderPrintPreviewTool = (
  printTemplateService: PrintTemplateService,
  salesInvoicePrintService: SalesInvoicePrintService,
  salesShipmentPrintService: SalesShipmentPrintService,
  workspaceId: string,
  assertCanReadObjectRecords: (objectNameSingular: string) => Promise<void>,
) => ({
  description:
    'Render a print preview for a specific document record: the effective HTML (custom override or built-in), which template was used, and any placeholder names in the active override that this print service does not know how to fill (they render literally, not as an error).',
  inputSchema: renderPrintPreviewInputSchema,
  execute: async ({
    documentType,
    recordId,
  }: z.infer<
    typeof renderPrintPreviewInputSchema
  >): Promise<RenderPrintPreviewResult> => {
    await assertCanReadObjectRecords('printTemplate');
    await assertCanReadObjectRecords(PRINT_DOCUMENT_OBJECT_NAME[documentType]);

    const activeOverride = await printTemplateService.findActiveTemplate(
      workspaceId,
      documentType,
    );
    const {
      html: effectiveTemplateHtml,
      source,
      fallbackReason,
    } = printTemplateService.resolveTemplateHtml(
      activeOverride,
      PRINT_DOCUMENT_BUILT_IN_TEMPLATE[documentType],
    );
    const unfilledPlaceholders = findUnknownPlaceholderNames(
      effectiveTemplateHtml,
      PRINT_DOCUMENT_KNOWN_PLACEHOLDERS[documentType],
    );

    const html =
      documentType === 'SCHET'
        ? await salesInvoicePrintService.renderSalesInvoiceHtml(
            workspaceId,
            recordId,
          )
        : await salesShipmentPrintService.renderSalesShipmentUpdHtml(
            workspaceId,
            recordId,
            DEFAULT_UPD_STATUS,
          );

    return { html, source, fallbackReason, unfilledPlaceholders };
  },
});
