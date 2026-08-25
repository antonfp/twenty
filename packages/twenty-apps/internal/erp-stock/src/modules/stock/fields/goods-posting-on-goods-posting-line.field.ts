import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting-line.object';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';

export const GOODS_POSTING_ON_GOODS_POSTING_LINE_ID = '65ee7c1a-c7f5-4de6-a543-366491f4582f';
export const LINES_ON_GOODS_POSTING_ID = 'd71dfc12-4790-4a05-aa96-35e35cf1791b';

export default defineField({
  universalIdentifier: GOODS_POSTING_ON_GOODS_POSTING_LINE_ID,
  objectUniversalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsPosting',
  label: 'Оприходование',
  icon: 'IconPackages',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_GOODS_POSTING_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'goodsPostingId',
  },
});
