import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_GOODS_RECEIPT_LINE_ID, GOODS_RECEIPT_LINES_ON_ITEM_ID } from './item-on-goods-receipt-line.field';

export default defineField({
  universalIdentifier: GOODS_RECEIPT_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsReceiptLines',
  label: 'Строки поступлений товаров',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_GOODS_RECEIPT_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
