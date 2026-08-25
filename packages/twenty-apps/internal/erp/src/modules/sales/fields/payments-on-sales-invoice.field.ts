import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { SALES_INVOICE_ON_PAYMENT_ID, PAYMENTS_ON_SALES_INVOICE_ID } from './sales-invoice-on-payment.field';

export default defineField({
  universalIdentifier: PAYMENTS_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'payments',
  label: 'Оплаты',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_INVOICE_ON_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
