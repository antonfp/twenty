import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_OGRN_FIELD_UNIVERSAL_IDENTIFIER =
  '9517598f-736c-4d4c-b7d8-b9f9499bfc54';

export default defineField({
  universalIdentifier: COMPANY_OGRN_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'ogrn',
  label: 'ОГРН',
  icon: 'IconId',
  isNullable: true,
});
