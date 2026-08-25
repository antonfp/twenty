import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_BIK_FIELD_UNIVERSAL_IDENTIFIER =
  '72345473-5540-497e-b4f9-7f609bac3d40';

export default defineField({
  universalIdentifier: COMPANY_BIK_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'bik',
  label: 'БИК',
  icon: 'IconHash',
  isNullable: true,
});
