import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_LEGAL_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER =
  '7727c049-d368-455b-a3e8-74f2b67dab16';

export default defineField({
  universalIdentifier: COMPANY_LEGAL_ADDRESS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'legalAddress',
  label: 'Юридический адрес',
  icon: 'IconMapPin',
  isNullable: true,
});
