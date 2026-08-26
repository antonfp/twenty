import { defineObject, FieldType } from 'twenty-sdk/define';

export const GL_ENTRY_UNIVERSAL_IDENTIFIER =
  '484daa75-af50-4398-a169-6720ac44951e';

export const GL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '4b643a64-0b6d-4be8-bec5-b1178c49cd92';

export default defineObject({
  universalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  nameSingular: 'glEntry',
  namePlural: 'glEntries',
  labelSingular: 'Проводка',
  labelPlural: 'Проводки',
  description:
    'Регистр проводок (Главная книга, append-only, записи создаёт только сервер при проведении документов)',
  icon: 'IconBook2',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GL_ENTRY_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'e8faa836-7fad-4439-b061-370bdc66fd06',
      type: FieldType.DATE,
      name: 'date',
      label: 'Дата',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '9521da46-8a93-47ee-9287-5b994476c9c1',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: '7f47edd0-7a9e-4268-9269-7919e4529d47',
      type: FieldType.TEXT,
      name: 'voucherType',
      label: 'Документ-основание (тип)',
      icon: 'IconFileSymlink',
      isNullable: true,
    },
    {
      universalIdentifier: 'd8a95897-b39e-411b-921b-cf915aeb9874',
      type: FieldType.TEXT,
      name: 'voucherId',
      label: 'Документ-основание (id)',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'c55d4aa1-c30c-4c68-922d-c463935236c4',
      type: FieldType.BOOLEAN,
      name: 'isCancelled',
      label: 'Сторнирована',
      icon: 'IconBan',
      defaultValue: false,
    },
    {
      universalIdentifier: '01188dd3-f925-46ae-b2ab-d04f9ecff286',
      type: FieldType.BOOLEAN,
      name: 'isCancellation',
      label: 'Сторно-запись',
      icon: 'IconArrowBackUp',
      defaultValue: false,
    },
  ],
});
