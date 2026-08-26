// documentType values on the printTemplate object (erp-base) — SCHET is the
// «Счёт» invoice print form, UPD the «УПД» shipment print form.
export const PRINT_DOCUMENT_TYPES = ['SCHET', 'UPD'] as const;

export type PrintDocumentType = (typeof PRINT_DOCUMENT_TYPES)[number];

// The workspace document object each documentType prints from — used for the
// read-permission check on render_print_preview, alongside the printTemplate
// object's own.
export const PRINT_DOCUMENT_OBJECT_NAME: Record<PrintDocumentType, string> = {
  SCHET: 'salesInvoice',
  UPD: 'salesShipment',
};
