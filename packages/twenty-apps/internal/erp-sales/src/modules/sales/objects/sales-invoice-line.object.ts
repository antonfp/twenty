import { defineObject, FieldType } from 'twenty-sdk/define';

enum VatRate {
  VAT_22 = 'VAT_22',
  VAT_20 = 'VAT_20',
  VAT_10 = 'VAT_10',
  VAT_0 = 'VAT_0',
  NO_VAT = 'NO_VAT',
}

export const SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER =
  '63989818-38ff-45eb-aab7-60c4c3a6fc55';

export const SALES_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '215588ab-71df-4c31-800c-b99d0caae970';

export default defineObject({
  universalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'salesInvoiceLine',
  namePlural: 'salesInvoiceLines',
  labelSingular: 'Строка счёта',
  labelPlural: 'Строки счёта',
  description: 'Позиция счёта покупателю',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SALES_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SALES_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description: 'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '53cfbda2-45c3-47bf-8664-c854dabdc008',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '889257f4-88e9-4e86-8d85-7164a603b3ce',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'cd48f4d8-9739-4562-80bd-6eaf32053133',
      type: FieldType.SELECT,
      name: 'vatRate',
      label: 'Ставка НДС',
      icon: 'IconPercentage',
      defaultValue: `'${VatRate.VAT_22}'`,
      options: [
        {
          id: 'e107c491-9623-4003-818b-6b5a006bbf2d',
          value: VatRate.VAT_22,
          label: '22%',
          position: 0,
          color: 'purple',
        },
        {
          id: '1420ac77-6509-465d-beb0-3c341cd402db',
          value: VatRate.VAT_20,
          label: '20%',
          position: 1,
          color: 'blue',
        },
        {
          id: '8c0dc61d-b2a1-4968-b7ca-0863c08b85b0',
          value: VatRate.VAT_10,
          label: '10%',
          position: 2,
          color: 'green',
        },
        {
          id: '58cfa34e-5152-40cf-9117-4675346aa58a',
          value: VatRate.VAT_0,
          label: '0%',
          position: 3,
          color: 'yellow',
        },
        {
          id: '76c9179d-dc77-44e8-8edb-9a2b50f28ab8',
          value: VatRate.NO_VAT,
          label: 'Без НДС',
          position: 4,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: '4917430d-9aa5-4eae-9f67-406c0bb8043e',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Итог строки, с НДС',
      icon: 'IconSum',
      isNullable: true,
    },
  ],
});
