import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_GOODS_RECEIPT_LINE_ID = '0b9b68ef-5baa-41aa-a5db-c728e2cb9eb4';
export const GOODS_RECEIPT_LINES_ON_ITEM_ID = '617eed7e-9a66-465b-9317-b77565055aa0';

export default defineField({
  universalIdentifier: ITEM_ON_GOODS_RECEIPT_LINE_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_RECEIPT_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
