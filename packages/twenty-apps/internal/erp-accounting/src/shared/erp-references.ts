// erp-accounting depends on erp-base, erp-sales, erp-purchases AND erp-stock
// (see application-config.ts `dependencies`). Apps are separate SDK projects
// with no cross-project TypeScript imports, so referenced universalIdentifiers
// are copied here verbatim — they MUST stay in sync with the source object
// files:
//   erp-base/src/modules/directories/objects/{organization,item}.object.ts
export const ORGANIZATION_UNIVERSAL_IDENTIFIER =
  'c702b6c3-afeb-4355-803b-e223acbe0205';

export const ITEM_UNIVERSAL_IDENTIFIER = 'a77a6d5f-0002-47cd-ab92-3e74e8f9d41c';

// Task 9 (дашборд «ERP-сводка») — erp-sales/modules/sales/objects/sales-invoice.object.ts
// + erp-sales/modules/sales/fields/customer-on-sales-invoice.field.ts
export const SALES_INVOICE_UNIVERSAL_IDENTIFIER =
  'b5de66aa-2632-4ebf-8a72-5b7da875b34e';
export const SALES_INVOICE_NUMBER_FIELD_ID =
  '74459548-3a21-41a8-91f1-a322b37e85bb';
export const SALES_INVOICE_DOC_STATUS_FIELD_ID =
  '8a1d95c3-ba12-44c6-aace-abe05d7d5e48';
// postingDate exists on the object; before Task 10 the core PostingService
// never backfilled it (live-checked: 0/177 POSTED invoices had it set), so
// invoices POSTED before that fix still carry null — postedAt (DATE_TIME,
// always set on posting) stays the field these dashboard views group/sort
// by, so they don't need a migration to keep working for that historic set.
export const SALES_INVOICE_POSTED_AT_FIELD_ID =
  'ee09c6fc-2be5-4b36-be59-89267215a9c3';
export const SALES_INVOICE_TOTAL_FIELD_ID =
  '727dba6b-d14c-4dda-acc2-28b9096e7484';
export const SALES_INVOICE_PAYMENT_STATUS_FIELD_ID =
  '2b4f5c31-f2bd-4bcb-be00-acf7a15eeb4d';
export const SALES_INVOICE_PAID_AMOUNT_FIELD_ID =
  'a8f0f2a1-61ac-42e1-80ac-2932813029c0';
export const CUSTOMER_ON_SALES_INVOICE_FIELD_ID =
  '1b2ac653-079c-41ca-8f91-9e6cf648f533';

// Task 9 — erp-stock/modules/stock/objects/item-balance.object.ts
// + erp-stock/modules/stock/fields/{item,warehouse}-on-item-balance.field.ts
export const ITEM_BALANCE_UNIVERSAL_IDENTIFIER =
  '7f12eb25-99d4-473f-b0dd-080e2aca670f';
export const ITEM_BALANCE_ACTUAL_QTY_FIELD_ID =
  'cfc1640a-923e-465d-96e6-3f8f95ae36d0';
export const ITEM_BALANCE_AVG_COST_FIELD_ID =
  '7ffe367e-f718-4ec2-8a6c-871b006fd90b';
export const ITEM_ON_ITEM_BALANCE_FIELD_ID =
  '40fc7e02-03cc-401f-91d2-3eb66cb42f57';
export const WAREHOUSE_ON_ITEM_BALANCE_FIELD_ID =
  '9005f4ec-0b3e-438e-a8df-a07549398c11';
