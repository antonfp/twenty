import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';

export const SALES_INVOICE_ON_PAYMENT_ID = 'b291e412-9555-4063-a5a0-3fce5cdc73eb';
export const PAYMENTS_ON_SALES_INVOICE_ID = '74590c43-d943-49f1-af5c-5a6eae88cddb';

export default defineField({
  universalIdentifier: SALES_INVOICE_ON_PAYMENT_ID,
  objectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesInvoice',
  label: 'Счёт',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PAYMENTS_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'salesInvoiceId',
  },
});
