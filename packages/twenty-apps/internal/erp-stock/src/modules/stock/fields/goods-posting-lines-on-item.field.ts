import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_GOODS_POSTING_LINE_ID, GOODS_POSTING_LINES_ON_ITEM_ID } from './item-on-goods-posting-line.field';

export default defineField({
  universalIdentifier: GOODS_POSTING_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsPostingLines',
  label: 'Строки оприходований товаров',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_GOODS_POSTING_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
