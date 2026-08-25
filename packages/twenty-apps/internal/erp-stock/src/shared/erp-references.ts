// erp-stock depends on erp-base, erp-sales AND erp-purchases (see
// application-config.ts `dependencies`) and references objects owned by all
// three. Apps are separate SDK projects with no cross-project TypeScript
// imports, so the referenced universalIdentifiers are copied here verbatim —
// they MUST stay in sync with the source object files:
//   erp-base/src/modules/directories/objects/{organization,item,warehouse}.object.ts
//   erp-sales/src/modules/sales/objects/sales-invoice.object.ts
//   erp-purchases/src/modules/purchases/objects/supplier-invoice.object.ts
export const ORGANIZATION_UNIVERSAL_IDENTIFIER =
  'c702b6c3-afeb-4355-803b-e223acbe0205';

export const ITEM_UNIVERSAL_IDENTIFIER =
  'a77a6d5f-0002-47cd-ab92-3e74e8f9d41c';

export const WAREHOUSE_UNIVERSAL_IDENTIFIER =
  '18deb778-96ab-4c49-bad5-f9136cc503a2';

export const SALES_INVOICE_UNIVERSAL_IDENTIFIER =
  'b5de66aa-2632-4ebf-8a72-5b7da875b34e';

export const SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER =
  'e635330e-2de5-4b54-a527-9ec255dab0d2';
