import { defineObject, FieldType } from 'twenty-sdk/define';

export const GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER =
  '8f606b7d-238e-4017-8a8f-bc0f7aaaa8af';

export const GOODS_RECEIPT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '4958d15e-ebdb-4e88-a53f-c244865c47dd';

export default defineObject({
  universalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsReceiptLine',
  namePlural: 'goodsReceiptLines',
  labelSingular: 'Строка поступления товаров',
  labelPlural: 'Строки поступлений товаров',
  description: 'Позиция поступления товаров',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_RECEIPT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GOODS_RECEIPT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '206e0800-38e6-4318-95e5-e47daedab81f',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: 'b3957814-0b46-4d5b-9798-7d20b89de230',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена (себестоимость)',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'd0a4e59e-84b8-4f55-ba15-eec8a6e60dbe',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Итог строки — количество × цена',
      icon: 'IconSum',
      isNullable: true,
    },
  ],
});
