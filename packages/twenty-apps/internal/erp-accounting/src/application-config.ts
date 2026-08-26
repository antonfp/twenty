import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '1de9d48b-4bdf-4301-b1a0-51b09452c017';

// Apps are separate SDK projects (no cross-project TS imports), so these
// dependency universalIdentifiers are copied verbatim — MUST match each
// project's own src/application-config.ts.
const ERP_BASE_UNIVERSAL_IDENTIFIER = '5de98d5e-9e03-43c3-9a68-6e2918d32613';
const ERP_SALES_UNIVERSAL_IDENTIFIER = '4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b';
const ERP_PURCHASES_UNIVERSAL_IDENTIFIER =
  'c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1';
const ERP_STOCK_UNIVERSAL_IDENTIFIER = 'b449d3c2-d699-4437-85f1-70670094f5c9';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'ERPilot: Бухгалтерия',
  description:
    'ERPilot: блок бухгалтерии — план счетов, ручные операции и регистр проводок (РСБУ). Требует установленных erp-base, erp-sales, erp-purchases, erp-stock (ссылается на их объекты).',
  // manualEntryLine/glEntry ссылаются на organization/item (erp-base) и на
  // company (STANDARD-объект платформы). erp-sales/erp-purchases/erp-stock
  // — зависимости платформы (документы-основания для будущих проводок,
  // Task 2), не объектные ссылки этого таска. См. shared/erp-references.ts.
  dependencies: [
    ERP_BASE_UNIVERSAL_IDENTIFIER,
    ERP_SALES_UNIVERSAL_IDENTIFIER,
    ERP_PURCHASES_UNIVERSAL_IDENTIFIER,
    ERP_STOCK_UNIVERSAL_IDENTIFIER,
  ],
});
