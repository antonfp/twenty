import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt-line.object';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';

export const GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID = '5f145563-8dc6-4a8c-a93a-848103556569';
export const LINES_ON_GOODS_RECEIPT_ID = 'b732785e-987f-400c-b6d9-ad7bc0df75e2';

export default defineField({
  universalIdentifier: GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsReceipt',
  label: 'Поступление',
  icon: 'IconPackageImport',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_GOODS_RECEIPT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'goodsReceiptId',
  },
});
