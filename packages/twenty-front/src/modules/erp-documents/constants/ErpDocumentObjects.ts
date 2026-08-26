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
  ] as readonly string[],
  SALES_INVOICE_NAME_SINGULAR: 'salesInvoice',
  SALES_SHIPMENT_NAME_SINGULAR: 'salesShipment',
};
