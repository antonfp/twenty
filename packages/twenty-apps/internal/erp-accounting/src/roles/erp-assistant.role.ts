import {
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  SystemPermissionFlag,
  defineRole,
} from 'twenty-sdk/define';

export const ERP_ASSISTANT_ROLE_UNIVERSAL_IDENTIFIER =
  '417b4f01-e0a4-42dd-ae80-61da9542bf1c';

// erp-accounting depends on erp-base, erp-sales, erp-purchases and erp-stock
// (see application-config.ts `dependencies`) so by the time this role
// installs, every object it references already exists. Apps are separate SDK
// projects with no cross-project TypeScript imports, so the referenced
// universalIdentifiers are copied here verbatim from each object's own
// *.object.ts file — they MUST stay in sync with the source.

// erp-base: справочники (writable) — organization.object.ts, item.object.ts,
// item-price.object.ts, price-type.object.ts, warehouse.object.ts,
// print-template.object.ts (Task 4 customizable print templates).
const ORGANIZATION_UNIVERSAL_IDENTIFIER =
  'c702b6c3-afeb-4355-803b-e223acbe0205';
const ITEM_UNIVERSAL_IDENTIFIER = 'a77a6d5f-0002-47cd-ab92-3e74e8f9d41c';
const ITEM_PRICE_UNIVERSAL_IDENTIFIER = 'fd8ffea0-ac4a-4492-89e8-354d2f6aefa8';
const PRICE_TYPE_UNIVERSAL_IDENTIFIER = 'eae4e9a8-35af-497b-8cf2-c17474b2f19e';
const WAREHOUSE_UNIVERSAL_IDENTIFIER = '18deb778-96ab-4c49-bad5-f9136cc503a2';
const PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER =
  '65434929-2c0e-4531-b25f-ac983bb04b1a';

// erp-base: регистр взаиморасчётов — party-ledger-entry.object.ts. Register:
// read-only (ruling Phase 8 — "нельзя трогать регистры").
const PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER =
  'c424264b-238f-4c07-b781-3f1fee039947';

// erp-sales: документы продаж (writable) — sales-invoice.object.ts,
// sales-invoice-line.object.ts, payment.object.ts.
const SALES_INVOICE_UNIVERSAL_IDENTIFIER =
  'b5de66aa-2632-4ebf-8a72-5b7da875b34e';
const SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER =
  '63989818-38ff-45eb-aab7-60c4c3a6fc55';
const PAYMENT_UNIVERSAL_IDENTIFIER = 'd4e3fc58-2142-444f-9e5d-eb5656369786';

// erp-purchases: документы закупок (writable) — supplier-invoice.object.ts,
// supplier-invoice-line.object.ts, supplier-payment.object.ts.
const SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER =
  'e635330e-2de5-4b54-a527-9ec255dab0d2';
const SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER =
  '95be8bf6-f9cf-42cf-9257-87525ece3d78';
const SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER =
  '2f73d8af-e9c2-4657-921e-3bd267d3e639';

// erp-stock: складские документы (writable) — goods-receipt.object.ts,
// goods-receipt-line.object.ts, sales-shipment.object.ts,
// sales-shipment-line.object.ts, goods-write-off.object.ts,
// goods-write-off-line.object.ts, goods-posting.object.ts,
// goods-posting-line.object.ts, stock-transfer.object.ts,
// stock-transfer-line.object.ts.
const GOODS_RECEIPT_UNIVERSAL_IDENTIFIER =
  'b58e4fdb-4543-4110-99a7-33b0c8cc07c2';
const GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER =
  '8f606b7d-238e-4017-8a8f-bc0f7aaaa8af';
const SALES_SHIPMENT_UNIVERSAL_IDENTIFIER =
  '76f05a56-2f6e-4feb-820c-67c14bcdc9b9';
const SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER =
  'a5e63f1c-0909-4bda-994b-d053bf3b4dc0';
const GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER =
  'f44f0b36-a76e-41df-9ba5-e3647a623f01';
const GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER =
  '0d3989d8-ff91-49d5-b28b-6bf15671a94e';
const GOODS_POSTING_UNIVERSAL_IDENTIFIER =
  'e82edcbb-ff58-4d81-afa7-026afc486e84';
const GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER =
  '8bccb770-0feb-46de-aeb5-4f37d89aaaf0';
const STOCK_TRANSFER_UNIVERSAL_IDENTIFIER =
  '074a8f44-5274-4f12-9bb4-385659aa6356';
const STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER =
  '3f91a3b5-a6d9-4c5c-8e5f-5ed9d96c03bb';

// erp-stock: регистры движений/остатков — stock-ledger-entry.object.ts,
// item-balance.object.ts. Registers: read-only.
const STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER =
  '71e81950-93a6-4bb0-b9ce-524bc4d4f430';
const ITEM_BALANCE_UNIVERSAL_IDENTIFIER =
  '7f12eb25-99d4-473f-b0dd-080e2aca670f';

// erp-accounting (this app): account.object.ts, manual-entry.object.ts,
// manual-entry-line.object.ts (writable); gl-entry.object.ts — регистр
// проводок, read-only.
const ACCOUNT_UNIVERSAL_IDENTIFIER = '412bff53-1e68-44f2-b1d9-2f5a48e252dc';
const MANUAL_ENTRY_UNIVERSAL_IDENTIFIER =
  'a7fef56d-d3ff-4d95-851b-4df5d59d7ccb';
const MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER =
  'ad191fc2-fe1b-41e0-9ba3-aee67d64268c';
const GL_ENTRY_UNIVERSAL_IDENTIFIER = '484daa75-af50-4398-a169-6720ac44951e';

const WRITABLE_OBJECT_UNIVERSAL_IDENTIFIERS = [
  // справочники (erp-base)
  ORGANIZATION_UNIVERSAL_IDENTIFIER,
  ITEM_UNIVERSAL_IDENTIFIER,
  ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  PRICE_TYPE_UNIVERSAL_IDENTIFIER,
  WAREHOUSE_UNIVERSAL_IDENTIFIER,
  PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER,
  // продажи (erp-sales)
  SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  PAYMENT_UNIVERSAL_IDENTIFIER,
  // закупки (erp-purchases)
  SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  // склад (erp-stock)
  GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  // бухгалтерия (erp-accounting)
  ACCOUNT_UNIVERSAL_IDENTIFIER,
  MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
] as const;

// Ruling (Phase 8, docs/plans/phase8-mcp-ai.md): registers are read-only from
// outside the posting core — no field/view writes, and here no record writes
// either. post_document/cancel_document (not generic record update) are the
// only legal way to make a register entry appear or reverse.
const READ_ONLY_REGISTER_OBJECT_UNIVERSAL_IDENTIFIERS = [
  PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  GL_ENTRY_UNIVERSAL_IDENTIFIER,
] as const;

export default defineRole({
  universalIdentifier: ERP_ASSISTANT_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'ERPilot-ассистент',
  description:
    'Права разговорного ERP-агента «ERPilot-ассистент»: чтение и изменение справочников и документов всех блоков ERPilot (справочники, продажи, закупки, склад, бухгалтерия) и стандартного объекта «Компания» (контрагенты). Регистры (взаиморасчёты, движения товара, остатки, проводки) — только чтение, запись запрещена (ruling Phase 8). Привязана к агенту через roleUniversalIdentifier — не назначается пользователям/API-ключам напрямую.',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: true,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    ...WRITABLE_OBJECT_UNIVERSAL_IDENTIFIERS.map(
      (objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadObjectRecords: true,
        canUpdateObjectRecords: true,
        canSoftDeleteObjectRecords: true,
        canDestroyObjectRecords: false,
      }),
    ),
    ...READ_ONLY_REGISTER_OBJECT_UNIVERSAL_IDENTIFIERS.map(
      (objectUniversalIdentifier) => ({
        objectUniversalIdentifier,
        canReadObjectRecords: true,
        canUpdateObjectRecords: false,
        canSoftDeleteObjectRecords: false,
        canDestroyObjectRecords: false,
      }),
    ),
    {
      objectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: true,
      canSoftDeleteObjectRecords: true,
      canDestroyObjectRecords: false,
    },
    {
      objectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    },
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [SystemPermissionFlag.AI],
});
