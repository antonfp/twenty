import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_IS_CUSTOMER_FIELD_UNIVERSAL_IDENTIFIER =
  '0d3765b5-623e-4180-8b7a-168c72b5da26';

export default defineField({
  universalIdentifier: COMPANY_IS_CUSTOMER_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'isCustomer',
  label: 'Покупатель',
  description: 'Контрагент выступает покупателем',
  icon: 'IconUserCheck',
  defaultValue: false,
});
