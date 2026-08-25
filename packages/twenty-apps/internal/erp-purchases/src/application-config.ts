import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1';

// Apps are separate SDK projects (no cross-project TS imports), so the
// erp-base universalIdentifier is copied verbatim — MUST match erp-base's
// src/application-config.ts.
const ERP_BASE_UNIVERSAL_IDENTIFIER = '5de98d5e-9e03-43c3-9a68-6e2918d32613';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'ERPilot: Закупки',
  description:
    'ERPilot: блок закупок — счета поставщиков, оплаты поставщикам. Требует установленного erp-base (справочники, регистр взаиморасчётов).',
  // Requires erp-base installed first: supplierInvoiceLine.item и
  // supplierInvoice/supplierPayment.organization ссылаются на объекты erp-base.
  dependencies: [ERP_BASE_UNIVERSAL_IDENTIFIER],
});
