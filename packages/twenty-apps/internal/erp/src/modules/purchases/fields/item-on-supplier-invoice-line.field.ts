import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../directories/objects/item.object';

export const ITEM_ON_SUPPLIER_INVOICE_LINE_ID = 'a572c7b4-a3f9-4f28-a2bb-61f7daacd1d0';
export const SUPPLIER_INVOICE_LINES_ON_ITEM_ID = '163881b9-6a64-48e8-8ca7-1a0773943b02';

export default defineField({
  universalIdentifier: ITEM_ON_SUPPLIER_INVOICE_LINE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
