import { defineObject, FieldType } from 'twenty-sdk/define';

export const GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER =
  '0d3989d8-ff91-49d5-b28b-6bf15671a94e';

export const GOODS_WRITE_OFF_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '94afcdb7-c09d-41d4-ad64-483d09a623b9';

export default defineObject({
  universalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsWriteOffLine',
  namePlural: 'goodsWriteOffLines',
  labelSingular: 'Строка списания товаров',
  labelPlural: 'Строки списаний товаров',
  description: 'Позиция списания товаров',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_WRITE_OFF_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        GOODS_WRITE_OFF_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '976516dd-9c93-49c4-bd95-0431571bfc7d',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '909b1bf5-8759-4d42-83f9-e1cb5a078241',
      type: FieldType.TEXT,
      name: 'reason',
      label: 'Причина',
      description: 'Комментарий причины списания',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
