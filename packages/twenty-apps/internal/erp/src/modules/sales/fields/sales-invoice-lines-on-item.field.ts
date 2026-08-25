import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../directories/objects/item.object';
import { ITEM_ON_SALES_INVOICE_LINE_ID, SALES_INVOICE_LINES_ON_ITEM_ID } from './item-on-sales-invoice-line.field';

export default defineField({
  universalIdentifier: SALES_INVOICE_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesInvoiceLines',
  label: 'Строки счетов',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_SALES_INVOICE_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
