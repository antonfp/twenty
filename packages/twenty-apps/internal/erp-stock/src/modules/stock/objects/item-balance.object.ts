import { defineObject, FieldType } from 'twenty-sdk/define';

export const ITEM_BALANCE_UNIVERSAL_IDENTIFIER =
  '7f12eb25-99d4-473f-b0dd-080e2aca670f';

export const ITEM_BALANCE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '11a789d9-5792-4832-8ee0-03d4179d3caa';

export default defineObject({
  universalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'itemBalance',
  namePlural: 'itemBalances',
  labelSingular: 'Остаток товара',
  labelPlural: 'Остатки товаров',
  description:
    'Регистр остатков товаров по складам (item × warehouse, обновляет только сервер)',
  icon: 'IconStack2',
  labelIdentifierFieldMetadataUniversalIdentifier:
    ITEM_BALANCE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ITEM_BALANCE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'cfc1640a-923e-465d-96e6-3f8f95ae36d0',
      type: FieldType.NUMBER,
      name: 'actualQty',
      label: 'Остаток',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '7ffe367e-f718-4ec2-8a6c-871b006fd90b',
      type: FieldType.CURRENCY,
      name: 'avgCost',
      label: 'Средняя себестоимость',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
  ],
});
