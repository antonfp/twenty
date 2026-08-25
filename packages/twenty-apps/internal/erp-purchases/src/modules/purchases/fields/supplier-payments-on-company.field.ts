import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { SUPPLIER_ON_SUPPLIER_PAYMENT_ID, SUPPLIER_PAYMENTS_ON_COMPANY_ID } from './supplier-on-supplier-payment.field';

export default defineField({
  universalIdentifier: SUPPLIER_PAYMENTS_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'supplierPayments',
  label: 'Оплаты поставщикам',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_ON_SUPPLIER_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
