import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt-line.object';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID, LINES_ON_GOODS_RECEIPT_ID } from './goods-receipt-on-goods-receipt-line.field';

export default defineField({
  universalIdentifier: LINES_ON_GOODS_RECEIPT_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
