// Client-only command keys: the ERP command menu items are injected on the
// frontend (the generated EngineComponentKey enum comes from the server and
// cannot carry them), so CommandRunner resolves these before the generated map.
export const ERP_ENGINE_COMPONENT_KEYS = {
  POST_DOCUMENT: 'ERP_POST_DOCUMENT',
  CANCEL_DOCUMENT: 'ERP_CANCEL_DOCUMENT',
  PRINT_SALES_INVOICE: 'ERP_PRINT_SALES_INVOICE',
  PRINT_SALES_SHIPMENT_UPD: 'ERP_PRINT_SALES_SHIPMENT_UPD',
  CREATE_INVOICE_REVISION: 'ERP_CREATE_INVOICE_REVISION',
  CREATE_INVOICE_FROM_OPPORTUNITY: 'ERP_CREATE_INVOICE_FROM_OPPORTUNITY',
} as const;
