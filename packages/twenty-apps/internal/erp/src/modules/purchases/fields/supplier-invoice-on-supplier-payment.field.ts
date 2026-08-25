import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';

export const SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID = '741600c1-c4f1-4011-9f0a-77e6681ead88';
export const PAYMENTS_ON_SUPPLIER_INVOICE_ID = '0ac70b0e-8733-4499-83c4-3c67600dbed6';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID,
  objectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierInvoice',
  label: 'Счёт',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PAYMENTS_ON_SUPPLIER_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierInvoiceId',
  },
});
