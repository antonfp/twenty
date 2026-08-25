import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_GOODS_POSTING_LINE_ID = '0d2fca95-2c29-4246-a9fe-6356e0f8dc4e';
export const GOODS_POSTING_LINES_ON_ITEM_ID = '58d4d0a6-5f41-43a7-9f87-6ea6e082e296';

export default defineField({
  universalIdentifier: ITEM_ON_GOODS_POSTING_LINE_ID,
  objectUniversalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_POSTING_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
