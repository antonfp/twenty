import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_KPP_FIELD_UNIVERSAL_IDENTIFIER =
  '84f1833f-bd09-4d01-86e0-121ea3419a45';

export default defineField({
  universalIdentifier: COMPANY_KPP_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'kpp',
  label: 'КПП',
  icon: 'IconId',
  isNullable: true,
});
