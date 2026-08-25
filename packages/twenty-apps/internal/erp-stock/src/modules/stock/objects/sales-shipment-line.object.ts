import { defineObject, FieldType } from 'twenty-sdk/define';

enum VatRate {
  VAT_20 = 'VAT_20',
  VAT_10 = 'VAT_10',
  VAT_0 = 'VAT_0',
  NO_VAT = 'NO_VAT',
}

export const SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER =
  'a5e63f1c-0909-4bda-994b-d053bf3b4dc0';

export const SALES_SHIPMENT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'cd48fdbb-03ef-412d-bf00-b635336e1390';

export default defineObject({
  universalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'salesShipmentLine',
  namePlural: 'salesShipmentLines',
  labelSingular: 'Строка реализации товаров',
  labelPlural: 'Строки реализаций товаров',
  description: 'Позиция реализации товаров',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SALES_SHIPMENT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        SALES_SHIPMENT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '7c8176d0-ba77-4f26-adc4-1feafb27551d',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '0f093034-5c49-451e-a2b6-3ddd210cbb3f',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена продажи',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'e038c2d6-7241-4344-a7f4-adfc47c9100b',
      type: FieldType.SELECT,
      name: 'vatRate',
      label: 'Ставка НДС',
      icon: 'IconPercentage',
      defaultValue: `'${VatRate.VAT_20}'`,
      options: [
        {
          id: '35cf7b99-437b-48ce-a677-2a8b64994ce7',
          value: VatRate.VAT_20,
          label: '20%',
          position: 0,
          color: 'blue',
        },
        {
          id: '3a29bead-8cd3-4a5f-ba0f-f619a177dc79',
          value: VatRate.VAT_10,
          label: '10%',
          position: 1,
          color: 'green',
        },
        {
          id: '5b07bcc5-4b11-4c33-922c-02b5275898a2',
          value: VatRate.VAT_0,
          label: '0%',
          position: 2,
          color: 'yellow',
        },
        {
          id: 'b6a25fdd-0ee1-4d7d-a766-67170858915e',
          value: VatRate.NO_VAT,
          label: 'Без НДС',
          position: 3,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: '2c38f63a-9cd4-4468-a951-a3b638180d1b',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Итог строки, с НДС',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'a9753b52-65f5-467b-b8fd-0a8299261da7',
      type: FieldType.CURRENCY,
      name: 'costAmount',
      label: 'Себестоимость',
      description: 'Себестоимость списания строки — заполняется проведением',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
  ],
});
