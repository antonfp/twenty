import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_SETTLEMENT_ACCOUNT_FIELD_UNIVERSAL_IDENTIFIER =
  '5a2ec2c7-3d28-4c91-a12d-12a68ec1013e';

export default defineField({
  universalIdentifier: COMPANY_SETTLEMENT_ACCOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'settlementAccount',
  label: 'Расчётный счёт',
  icon: 'IconNumbers',
  isNullable: true,
});
