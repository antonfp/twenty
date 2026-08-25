import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting-line.object';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';
import { GOODS_POSTING_ON_GOODS_POSTING_LINE_ID, LINES_ON_GOODS_POSTING_ID } from './goods-posting-on-goods-posting-line.field';

export default defineField({
  universalIdentifier: LINES_ON_GOODS_POSTING_ID,
  objectUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_POSTING_ON_GOODS_POSTING_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
