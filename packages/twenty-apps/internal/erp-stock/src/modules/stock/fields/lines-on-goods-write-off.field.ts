import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off-line.object';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID, LINES_ON_GOODS_WRITE_OFF_ID } from './goods-write-off-on-goods-write-off-line.field';

export default defineField({
  universalIdentifier: LINES_ON_GOODS_WRITE_OFF_ID,
  objectUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
