import { defineObject, FieldType } from 'twenty-sdk/define';

export const PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER =
  'c424264b-238f-4c07-b781-3f1fee039947';

export const PARTY_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '051d9e96-483b-462b-917e-9f4448756983';

export default defineObject({
  universalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  nameSingular: 'partyLedgerEntry',
  namePlural: 'partyLedgerEntries',
  labelSingular: 'Запись взаиморасчётов',
  labelPlural: 'Взаиморасчёты',
  description:
    'Регистр взаиморасчётов с контрагентами (append-only, записи создаёт только сервер)',
  icon: 'IconScale',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PARTY_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PARTY_LEDGER_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '21c7670a-db5f-4b09-9fe8-c2d924c9999a',
      type: FieldType.TEXT,
      name: 'voucherType',
      label: 'Документ-основание (тип)',
      icon: 'IconFileSymlink',
      isNullable: true,
    },
    {
      universalIdentifier: 'c60ad929-a4f5-4f68-95e5-164bf9d904d3',
      type: FieldType.TEXT,
      name: 'voucherId',
      label: 'Документ-основание (id)',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '6b57b6ca-1b77-4c85-900c-0073aefa3ac4',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      description: 'Знаковая: + долг покупателя, − оплата',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'b2b7373d-3403-48e9-bdf1-c70e061ca037',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '1118c271-d7d3-476e-9245-22a46322b455',
      type: FieldType.BOOLEAN,
      name: 'isCancelled',
      label: 'Сторнирована',
      icon: 'IconBan',
      defaultValue: false,
    },
    {
      universalIdentifier: '8a4fcd13-534a-470a-806e-75cec9359e82',
      type: FieldType.BOOLEAN,
      name: 'isCancellation',
      label: 'Сторно-запись',
      icon: 'IconArrowBackUp',
      defaultValue: false,
    },
  ],
});
