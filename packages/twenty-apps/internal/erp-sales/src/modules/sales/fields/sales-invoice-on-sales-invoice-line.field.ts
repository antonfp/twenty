import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice-line.object';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';

export const SALES_INVOICE_ON_SALES_INVOICE_LINE_ID = '925c1ff2-22ea-4943-a5d9-1ec272e09d61';
export const LINES_ON_SALES_INVOICE_ID = 'bb98c7c2-f244-43cf-83e1-b142113d1df7';

export default defineField({
  universalIdentifier: SALES_INVOICE_ON_SALES_INVOICE_LINE_ID,
  objectUniversalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesInvoice',
  label: 'Счёт',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'salesInvoiceId',
  },
});
