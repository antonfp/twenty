// ERP document workspace objects (installed by the ERP app) that support
// posting through the core postDocument/cancelDocument mutations.
// Grouped into one const (rather than one export per constant) because
// constants/*.ts files are capped at a single const declaration.
export const ERP_DOCUMENT_OBJECTS = {
  NAME_SINGULARS: [
    'salesInvoice',
    'payment',
    'supplierInvoice',
    'supplierPayment',
    'goodsReceipt',
    'salesShipment',
    'stockTransfer',
    'goodsWriteOff',
    'goodsPosting',
    'manualEntry',
    'monthClose',
  ] as readonly string[],
  SALES_INVOICE_NAME_SINGULAR: 'salesInvoice',
  SALES_SHIPMENT_NAME_SINGULAR: 'salesShipment',
  // Not an ERP document object (no docStatus) — the CRM opportunity Task 8
  // glue command hangs off it separately, see buildErpDocumentCommandMenuItems.
  OPPORTUNITY_NAME_SINGULAR: 'opportunity',
  // Line objects that carry both `quantity` and `price` (and therefore a
  // derived `amount` = quantity × price) — mirrors the objects consumed by
  // computeInvoiceTotals/inflow-document-posting-rules on the server.
  // stockTransferLine/goodsWriteOffLine/manualEntryLine have no price field
  // and are intentionally excluded.
  LINE_OBJECTS_WITH_PRICE_NAME_SINGULARS: [
    'salesInvoiceLine',
    'supplierInvoiceLine',
    'salesShipmentLine',
    'goodsReceiptLine',
    'goodsPostingLine',
  ] as readonly string[],
};
