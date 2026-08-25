import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_INN_FIELD_UNIVERSAL_IDENTIFIER =
  '9bbd2665-ae7b-4af3-a36f-dfcbab8ec383';

export default defineField({
  universalIdentifier: COMPANY_INN_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'inn',
  label: 'ИНН',
  description: '10 цифр для юрлица, 12 для ИП',
  icon: 'IconId',
  isNullable: true,
});
