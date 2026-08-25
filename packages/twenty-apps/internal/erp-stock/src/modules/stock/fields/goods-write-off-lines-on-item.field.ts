import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_GOODS_WRITE_OFF_LINE_ID, GOODS_WRITE_OFF_LINES_ON_ITEM_ID } from './item-on-goods-write-off-line.field';

export default defineField({
  universalIdentifier: GOODS_WRITE_OFF_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsWriteOffLines',
  label: 'Строки списаний товаров',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_GOODS_WRITE_OFF_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
