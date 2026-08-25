import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-base-references';
import { ITEM_ON_SUPPLIER_INVOICE_LINE_ID, SUPPLIER_INVOICE_LINES_ON_ITEM_ID } from './item-on-supplier-invoice-line.field';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICE_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierInvoiceLines',
  label: 'Строки счетов поставщиков',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_SUPPLIER_INVOICE_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
