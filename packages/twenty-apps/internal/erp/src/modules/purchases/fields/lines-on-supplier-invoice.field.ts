import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice-line.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { SUPPLIER_INVOICE_ON_SUPPLIER_INVOICE_LINE_ID, LINES_ON_SUPPLIER_INVOICE_ID } from './supplier-invoice-on-supplier-invoice-line.field';

export default defineField({
  universalIdentifier: LINES_ON_SUPPLIER_INVOICE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_ON_SUPPLIER_INVOICE_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
