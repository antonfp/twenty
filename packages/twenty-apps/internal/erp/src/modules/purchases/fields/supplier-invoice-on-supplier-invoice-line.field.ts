import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice-line.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';

export const SUPPLIER_INVOICE_ON_SUPPLIER_INVOICE_LINE_ID = '0973d93d-0721-4401-8c0e-094a739fe7d0';
export const LINES_ON_SUPPLIER_INVOICE_ID = '5c444f22-bf6f-41df-bff0-3cbb5ae56883';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICE_ON_SUPPLIER_INVOICE_LINE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierInvoice',
  label: 'Счёт',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_SUPPLIER_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'supplierInvoiceId',
  },
});
