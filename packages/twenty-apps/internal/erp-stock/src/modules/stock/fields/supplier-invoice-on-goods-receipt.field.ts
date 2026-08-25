import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID = 'a80ec7b8-f8d9-4d05-a898-a8fd28677a73';
export const GOODS_RECEIPTS_ON_SUPPLIER_INVOICE_ID = '4a17dc16-bba8-4dbf-a8b9-1c293268e359';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierInvoice',
  label: 'Счёт поставщика',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_RECEIPTS_ON_SUPPLIER_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierInvoiceId',
  },
});
