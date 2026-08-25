import { defineObject, FieldType } from 'twenty-sdk/define';

export const STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER =
  '71e81950-93a6-4bb0-b9ce-524bc4d4f430';

export const STOCK_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '32e84086-c303-4827-8ca2-fc78d2cf1cb6';

export default defineObject({
  universalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockLedgerEntry',
  namePlural: 'stockLedgerEntries',
  labelSingular: 'Движение товара',
  labelPlural: 'Движения товаров',
  description:
    'Регистр движений товаров (append-only, записи создаёт только сервер)',
  icon: 'IconTimelineEvent',
  labelIdentifierFieldMetadataUniversalIdentifier:
    STOCK_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: STOCK_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '22e9b013-57eb-44bc-9e03-849d50626a90',
      type: FieldType.NUMBER,
      name: 'actualQty',
      label: 'Количество',
      description: 'Знаковое: + приход, − расход',
      icon: 'IconRuler2',
      isNullable: true,
    },
    {
      universalIdentifier: '6ebc4403-83ed-4147-bcac-bf731c4b2d42',
      type: FieldType.NUMBER,
      name: 'qtyAfter',
      label: 'Остаток после движения',
      icon: 'IconStack2',
      isNullable: true,
    },
    {
      universalIdentifier: '5fe38886-174a-4350-9ee9-d04780f0003e',
      type: FieldType.CURRENCY,
      name: 'valuationRate',
      label: 'Себестоимость (за ед.)',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'd1d21c89-1d42-4c2a-8cd4-f10a51de8cb2',
      type: FieldType.CURRENCY,
      name: 'stockValueDiff',
      label: 'Изменение стоимости',
      description: 'Знаковая: + приход, − расход',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'dfe21172-f8d4-4794-8f64-15c3987be5f9',
      type: FieldType.TEXT,
      name: 'voucherType',
      label: 'Документ-основание (тип)',
      icon: 'IconFileSymlink',
      isNullable: true,
    },
    {
      universalIdentifier: '9b489f10-d942-490d-8987-14297ee5aed2',
      type: FieldType.TEXT,
      name: 'voucherId',
      label: 'Документ-основание (id)',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '71672d93-660e-4c00-bee8-22b9c10617ef',
      type: FieldType.BOOLEAN,
      name: 'isCancelled',
      label: 'Сторнирована',
      icon: 'IconBan',
      defaultValue: false,
    },
    {
      universalIdentifier: '62f1cb00-0b47-4d06-8832-162a9c05c727',
      type: FieldType.BOOLEAN,
      name: 'isCancellation',
      label: 'Сторно-запись',
      icon: 'IconArrowBackUp',
      defaultValue: false,
    },
  ],
});
