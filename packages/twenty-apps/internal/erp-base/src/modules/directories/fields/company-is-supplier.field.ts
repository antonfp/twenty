import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const COMPANY_IS_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER =
  '1c0e7a0d-c1b3-420f-818d-bcb8ddde6950';

export default defineField({
  universalIdentifier: COMPANY_IS_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'isSupplier',
  label: 'Поставщик',
  description: 'Контрагент выступает поставщиком',
  icon: 'IconTruckDelivery',
  defaultValue: false,
});
