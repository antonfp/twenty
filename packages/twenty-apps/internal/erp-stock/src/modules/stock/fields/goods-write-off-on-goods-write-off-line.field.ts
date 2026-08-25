import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off-line.object';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';

export const GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID = '7d017bd3-6669-4f16-b318-6a04704d500d';
export const LINES_ON_GOODS_WRITE_OFF_ID = '9f201a23-b5f0-4da0-8cff-005e033dd01b';

export default defineField({
  universalIdentifier: GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID,
  objectUniversalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsWriteOff',
  label: 'Списание',
  icon: 'IconPackageOff',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_GOODS_WRITE_OFF_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'goodsWriteOffId',
  },
});
