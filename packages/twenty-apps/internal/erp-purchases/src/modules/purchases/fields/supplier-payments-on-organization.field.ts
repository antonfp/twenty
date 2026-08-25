import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-base-references';
import { ORGANIZATION_ON_SUPPLIER_PAYMENT_ID, SUPPLIER_PAYMENTS_ON_ORGANIZATION_ID } from './organization-on-supplier-payment.field';

export default defineField({
  universalIdentifier: SUPPLIER_PAYMENTS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierPayments',
  label: 'Оплаты поставщикам',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_SUPPLIER_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
