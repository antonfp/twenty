import { defineObject, FieldType } from 'twenty-sdk/define';

export const ITEM_PRICE_UNIVERSAL_IDENTIFIER =
  'fd8ffea0-ac4a-4492-89e8-354d2f6aefa8';

export const ITEM_PRICE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'a727bb0f-fa52-41b0-ba76-4034ebdc2659';

export default defineObject({
  universalIdentifier: ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'itemPrice',
  namePlural: 'itemPrices',
  labelSingular: 'Цена номенклатуры',
  labelPlural: 'Цены номенклатуры',
  description: 'Цена позиции номенклатуры по виду цен с датой начала действия',
  icon: 'IconCoin',
  labelIdentifierFieldMetadataUniversalIdentifier:
    ITEM_PRICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ITEM_PRICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description: 'Например «Розничная / Консультация»',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '4d72161a-b2cd-4b1b-8f1c-6c07616a5436',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'fc679b88-2483-4be3-b3a4-9cdb24239a17',
      type: FieldType.DATE,
      name: 'validFrom',
      label: 'Действует с',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
  ],
});
