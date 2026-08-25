import { defineApplication } from 'twenty-sdk/define';

// New identifier (Phase 3.5 Task 3 split): the old monolithic "ERPilot ERP"
// app (d356931a-f402-4a7c-89d9-c8497bbe838e) is uninstalled and replaced by
// three dependent apps — erp-base/erp-sales/erp-purchases. Object/field
// universalIdentifiers are unchanged (server modules and e2e key off those).
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '5de98d5e-9e03-43c3-9a68-6e2918d32613';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'ERPilot: Справочники',
  description:
    'ERPilot: базовый блок — справочники (организации, номенклатура, склады, виды цен, реквизиты контрагентов) и регистр взаиморасчётов. Зависимость для erp-sales и erp-purchases.',
});
