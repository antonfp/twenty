import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../directories/objects/item.object';

export const ITEM_ON_SALES_INVOICE_LINE_ID = '3d269858-a75c-4484-afa3-30444347d8b7';
export const SALES_INVOICE_LINES_ON_ITEM_ID = '278c9326-eedc-441e-8d7c-47c6f35eb926';

export default defineField({
  universalIdentifier: ITEM_ON_SALES_INVOICE_LINE_ID,
  objectUniversalIdentifier: SALES_INVOICE_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_INVOICE_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
