import { defineObject, FieldType } from 'twenty-sdk/define';

enum ItemType {
  GOODS = 'GOODS',
  SERVICE = 'SERVICE',
}

enum ItemUnit {
  PIECE = 'PIECE',
  SERVICE = 'SERVICE',
  HOUR = 'HOUR',
  DAY = 'DAY',
  MONTH = 'MONTH',
  KILOGRAM = 'KILOGRAM',
  METER = 'METER',
  SQUARE_METER = 'SQUARE_METER',
  SET = 'SET',
}

export enum VatRate {
  VAT_20 = 'VAT_20',
  VAT_10 = 'VAT_10',
  VAT_0 = 'VAT_0',
  NO_VAT = 'NO_VAT',
}

export const ITEM_UNIVERSAL_IDENTIFIER =
  'a77a6d5f-0002-47cd-ab92-3e74e8f9d41c';

export const ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '52839ad3-2e74-4ae8-946d-5f2ca9476920';

export default defineObject({
  universalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  nameSingular: 'item',
  namePlural: 'items',
  labelSingular: 'Номенклатура',
  labelPlural: 'Номенклатура',
  description: 'Товары и услуги',
  icon: 'IconPackage',
  labelIdentifierFieldMetadataUniversalIdentifier:
    ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '898012eb-2942-426c-a232-5dc388249003',
      type: FieldType.SELECT,
      name: 'itemType',
      label: 'Тип',
      icon: 'IconCategory',
      defaultValue: `'${ItemType.SERVICE}'`,
      options: [
        {
          id: '63228adc-1bf7-434e-b1df-48a61bf48fd8',
          value: ItemType.GOODS,
          label: 'Товар',
          position: 0,
          color: 'blue',
        },
        {
          id: '21122b55-cd76-4b0b-918e-b77f66d27775',
          value: ItemType.SERVICE,
          label: 'Услуга',
          position: 1,
          color: 'green',
        },
      ],
    },
    {
      universalIdentifier: '60469cbb-c905-48b4-a1c8-6ece41dcfb56',
      type: FieldType.TEXT,
      name: 'sku',
      label: 'Артикул',
      icon: 'IconBarcode',
      isNullable: true,
    },
    {
      universalIdentifier: 'b1204e9d-240f-410f-bf7e-79c654bc193b',
      type: FieldType.SELECT,
      name: 'unit',
      label: 'Ед. изм.',
      icon: 'IconRuler2',
      defaultValue: `'${ItemUnit.PIECE}'`,
      options: [
        {
          id: '8e4a1462-2109-480a-b7c3-56c6bb410c06',
          value: ItemUnit.PIECE,
          label: 'шт',
          position: 0,
          color: 'blue',
        },
        {
          id: '96fecb0f-2936-4d84-8ac7-aaf59749ff87',
          value: ItemUnit.SERVICE,
          label: 'усл',
          position: 1,
          color: 'green',
        },
        {
          id: 'f9b2c724-468e-4f6a-877c-9af080a73e11',
          value: ItemUnit.HOUR,
          label: 'ч',
          position: 2,
          color: 'turquoise',
        },
        {
          id: '661bf314-026b-4259-be37-dfe385784a8f',
          value: ItemUnit.DAY,
          label: 'день',
          position: 3,
          color: 'sky',
        },
        {
          id: '9ba6db05-d523-4cda-afcd-c3bee90f4396',
          value: ItemUnit.MONTH,
          label: 'мес',
          position: 4,
          color: 'purple',
        },
        {
          id: '450351b0-e255-419c-a7e8-de18026b01d2',
          value: ItemUnit.KILOGRAM,
          label: 'кг',
          position: 5,
          color: 'orange',
        },
        {
          id: 'e76a7ccb-c576-48a4-9a35-dd1b931b7213',
          value: ItemUnit.METER,
          label: 'м',
          position: 6,
          color: 'yellow',
        },
        {
          id: '1406ee19-f1a1-45b3-8b2b-2e63c9b17569',
          value: ItemUnit.SQUARE_METER,
          label: 'м²',
          position: 7,
          color: 'pink',
        },
        {
          id: '5a12c309-e279-444b-86ac-f863b3a4be4a',
          value: ItemUnit.SET,
          label: 'компл',
          position: 8,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: 'ee67a136-dcf3-4e81-8b4f-0f1388382182',
      type: FieldType.SELECT,
      name: 'vatRate',
      label: 'Ставка НДС',
      icon: 'IconPercentage',
      defaultValue: `'${VatRate.VAT_20}'`,
      options: [
        {
          id: '1ff6cfe5-dab4-4f87-b74c-a16368354b05',
          value: VatRate.VAT_20,
          label: '20%',
          position: 0,
          color: 'blue',
        },
        {
          id: '501c4b17-1854-49a5-8753-f1a1da4f4f00',
          value: VatRate.VAT_10,
          label: '10%',
          position: 1,
          color: 'green',
        },
        {
          id: '97976909-45bf-4b5a-9722-887ed25f14d8',
          value: VatRate.VAT_0,
          label: '0%',
          position: 2,
          color: 'yellow',
        },
        {
          id: 'c19530f2-ec9c-44f1-ba0b-93e4a3cfb6fd',
          value: VatRate.NO_VAT,
          label: 'Без НДС',
          position: 3,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: '306d6d9e-30b8-460d-85c7-365638d092ac',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена продажи',
      description: 'Базовая цена продажи, RUB',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: '30516076-b7ae-4c5e-a0ed-d0f652111856',
      type: FieldType.TEXT,
      name: 'description',
      label: 'Описание',
      icon: 'IconFileText',
      isNullable: true,
    },
  ],
});
