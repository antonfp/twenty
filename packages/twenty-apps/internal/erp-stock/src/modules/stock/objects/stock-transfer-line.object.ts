import { defineObject, FieldType } from 'twenty-sdk/define';

export const STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER =
  '3f91a3b5-a6d9-4c5c-8e5f-5ed9d96c03bb';

export const STOCK_TRANSFER_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '3723f870-9b53-4464-853b-90f1ee3c61e5';

export default defineObject({
  universalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockTransferLine',
  namePlural: 'stockTransferLines',
  labelSingular: 'Строка перемещения товаров',
  labelPlural: 'Строки перемещений товаров',
  description: 'Позиция перемещения товаров',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    STOCK_TRANSFER_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        STOCK_TRANSFER_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '19ffe184-a4c9-4ed9-b98e-7c6c3923589b',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
  ],
});
