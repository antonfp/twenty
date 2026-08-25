import { defineObject, FieldType } from 'twenty-sdk/define';

export const GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER =
  '8bccb770-0feb-46de-aeb5-4f37d89aaaf0';

export const GOODS_POSTING_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'edf03ca6-5354-454e-ad1a-8debcd955fa9';

export default defineObject({
  universalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsPostingLine',
  namePlural: 'goodsPostingLines',
  labelSingular: 'Строка оприходования товаров',
  labelPlural: 'Строки оприходований товаров',
  description: 'Позиция оприходования товаров',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_POSTING_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GOODS_POSTING_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '0916b3ab-48bf-4e0d-ae8f-2d6791ed828c',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '414e7ab5-84b8-4855-849f-9f5e06c4813d',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Себестоимость',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: '223af412-a00f-4340-942f-f8a68b46cf15',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Итог строки — количество × себестоимость',
      icon: 'IconSum',
      isNullable: true,
    },
  ],
});
