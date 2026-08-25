import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_GOODS_WRITE_OFF_LINE_ID = '71eea409-8e81-40a1-85e9-460c4cdf4b1d';
export const GOODS_WRITE_OFF_LINES_ON_ITEM_ID = '9b3fa7a5-4103-477a-abb3-be312d0f8ab7';

export default defineField({
  universalIdentifier: ITEM_ON_GOODS_WRITE_OFF_LINE_ID,
  objectUniversalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_WRITE_OFF_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
