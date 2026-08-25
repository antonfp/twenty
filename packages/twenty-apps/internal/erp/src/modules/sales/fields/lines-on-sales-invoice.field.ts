import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice-line.object';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { SALES_INVOICE_ON_SALES_INVOICE_LINE_ID, LINES_ON_SALES_INVOICE_ID } from './sales-invoice-on-sales-invoice-line.field';

export default defineField({
  universalIdentifier: LINES_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_INVOICE_ON_SALES_INVOICE_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
