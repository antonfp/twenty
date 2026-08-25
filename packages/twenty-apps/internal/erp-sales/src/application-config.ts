import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b';

// Apps are separate SDK projects (no cross-project TS imports), so the
// erp-base universalIdentifier is copied verbatim — MUST match erp-base's
// src/application-config.ts.
const ERP_BASE_UNIVERSAL_IDENTIFIER = '5de98d5e-9e03-43c3-9a68-6e2918d32613';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'ERPilot: Продажи',
  description:
    'ERPilot: блок продаж — счета покупателям, поступления оплат. Требует установленного erp-base (справочники, регистр взаиморасчётов).',
  // Requires erp-base installed first: salesInvoiceLine.item и
  // salesInvoice/payment.organization ссылаются на объекты erp-base.
  dependencies: [ERP_BASE_UNIVERSAL_IDENTIFIER],
});
