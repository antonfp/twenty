import { defineObject, FieldType } from 'twenty-sdk/define';

enum VatRate {
  VAT_22 = 'VAT_22',
  VAT_20 = 'VAT_20',
  VAT_10 = 'VAT_10',
  VAT_0 = 'VAT_0',
  NO_VAT = 'NO_VAT',
}

export const SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER =
  '95be8bf6-f9cf-42cf-9257-87525ece3d78';

export const SUPPLIER_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '34ff91c6-c418-4b3d-b55b-31e491d73734';

export default defineObject({
  universalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'supplierInvoiceLine',
  namePlural: 'supplierInvoiceLines',
  labelSingular: 'Строка счёта поставщика',
  labelPlural: 'Строки счетов поставщиков',
  description: 'Позиция счёта поставщика',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SUPPLIER_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier:
        SUPPLIER_INVOICE_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Наименование позиции — копия имени номенклатуры или свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'b0686780-48ef-47e1-b86c-dbb89fbccfb7',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Кол-во',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: 'd3f0acc9-852d-4d81-a24d-0fbce70280eb',
      type: FieldType.CURRENCY,
      name: 'price',
      label: 'Цена',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: '690de523-989f-4683-913d-5061d860bc99',
      type: FieldType.SELECT,
      name: 'vatRate',
      label: 'Ставка НДС',
      icon: 'IconPercentage',
      defaultValue: `'${VatRate.VAT_22}'`,
      options: [
        {
          id: 'ec43d198-8878-462d-a793-ba8cbc5fe87b',
          value: VatRate.VAT_22,
          label: '22%',
          position: 0,
          color: 'purple',
        },
        {
          id: '1438c346-a109-44b0-8a73-72444ab41cd7',
          value: VatRate.VAT_20,
          label: '20%',
          position: 1,
          color: 'blue',
        },
        {
          id: 'be92bcf0-86bd-4a81-89c8-4953391bab57',
          value: VatRate.VAT_10,
          label: '10%',
          position: 2,
          color: 'green',
        },
        {
          id: 'b0b302db-e609-4923-bad0-68754ffaeb5a',
          value: VatRate.VAT_0,
          label: '0%',
          position: 3,
          color: 'yellow',
        },
        {
          id: '82705167-9138-4d10-9d8f-5de30f7e72a0',
          value: VatRate.NO_VAT,
          label: 'Без НДС',
          position: 4,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: '4a8b604a-8c27-40c4-810b-664f4cd11483',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Итог строки, с НДС',
      icon: 'IconSum',
      isNullable: true,
    },
  ],
});
