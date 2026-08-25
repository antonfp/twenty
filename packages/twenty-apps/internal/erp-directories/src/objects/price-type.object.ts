import { defineObject, FieldType } from 'twenty-sdk/define';

export const PRICE_TYPE_UNIVERSAL_IDENTIFIER =
  'eae4e9a8-35af-497b-8cf2-c17474b2f19e';

export const PRICE_TYPE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '120a5b76-e90e-4cc3-9464-9cbdef56ad1b';

export default defineObject({
  universalIdentifier: PRICE_TYPE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'priceType',
  namePlural: 'priceTypes',
  labelSingular: 'Вид цен',
  labelPlural: 'Виды цен',
  description: 'Виды цен номенклатуры: розничная, оптовая и т.п.',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PRICE_TYPE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PRICE_TYPE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description: 'Например «Розничная», «Оптовая»',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '1cad641c-9ab0-4cf3-9b06-f7e3cba58de0',
      type: FieldType.BOOLEAN,
      name: 'includesVat',
      label: 'Цена включает НДС',
      icon: 'IconPercentage',
      defaultValue: true,
    },
  ],
});
