import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_BANK_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '6bb4aee1-bd09-4a5d-9892-a21fbbfcec00';

export default defineField({
  universalIdentifier: COMPANY_BANK_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'bankName',
  label: 'Банк',
  icon: 'IconBuildingBank',
  isNullable: true,
});
