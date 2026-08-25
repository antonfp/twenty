import { defineApplication } from 'twenty-sdk/define';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'd356931a-f402-4a7c-89d9-c8497bbe838e';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'ERPilot ERP',
  description:
    'ERPilot ERP: справочники (организации, номенклатура, склады, виды цен, реквизиты контрагентов) и продажи (счета покупателям, оплаты, взаиморасчёты)',
});
