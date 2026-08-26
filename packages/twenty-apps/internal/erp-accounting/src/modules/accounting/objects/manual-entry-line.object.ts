import { defineObject, FieldType } from 'twenty-sdk/define';

export const MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER =
  'ad191fc2-fe1b-41e0-9ba3-aee67d64268c';

export const MANUAL_ENTRY_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '074f2d57-77fa-44d7-bb6d-7d9df8941940';

export default defineObject({
  universalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'manualEntryLine',
  namePlural: 'manualEntryLines',
  labelSingular: 'Строка ручной операции',
  labelPlural: 'Строки ручных операций',
  description: 'Проводка (дебет/кредит/сумма) в составе ручной операции',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    MANUAL_ENTRY_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: MANUAL_ENTRY_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description: 'Содержание проводки — свободный текст',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '68887efe-0e26-4eb3-8a85-0529d0b8ed28',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
  ],
});
