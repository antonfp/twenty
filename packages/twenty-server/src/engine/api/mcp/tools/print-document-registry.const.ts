import { type PrintDocumentType } from 'src/engine/core-modules/erp/constants/print-document-type.const';
import { SCHET_TEMPLATE_HTML } from 'src/engine/core-modules/erp-sales/constants/schet-template.constant';
import { SALES_INVOICE_PLACEHOLDER_NAMES } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { UPD_TEMPLATE_HTML } from 'src/engine/core-modules/erp-stock/constants/upd-template.constant';
import { SALES_SHIPMENT_PLACEHOLDER_NAMES } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';

// Shared by get_print_template and render_print_preview — the built-in
// template text and known placeholder set per documentType, so both tools
// derive "source"/"unfilled placeholders" from the same data the print
// services themselves render from.
export const PRINT_DOCUMENT_BUILT_IN_TEMPLATE: Record<
  PrintDocumentType,
  string
> = {
  SCHET: SCHET_TEMPLATE_HTML,
  UPD: UPD_TEMPLATE_HTML,
};

export const PRINT_DOCUMENT_KNOWN_PLACEHOLDERS: Record<
  PrintDocumentType,
  ReadonlySet<string>
> = {
  SCHET: SALES_INVOICE_PLACEHOLDER_NAMES,
  UPD: SALES_SHIPMENT_PLACEHOLDER_NAMES,
};
