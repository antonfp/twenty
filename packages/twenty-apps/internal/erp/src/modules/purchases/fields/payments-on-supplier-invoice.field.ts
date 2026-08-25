import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID, PAYMENTS_ON_SUPPLIER_INVOICE_ID } from './supplier-invoice-on-supplier-payment.field';

export default defineField({
  universalIdentifier: PAYMENTS_ON_SUPPLIER_INVOICE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'payments',
  label: 'Оплаты',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
