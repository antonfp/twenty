import { AggregateOperations, ViewFilterOperand, defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER, GOODS_RECEIPT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt-line.object';
import { ITEM_ON_GOODS_RECEIPT_LINE_ID } from '../fields/item-on-goods-receipt-line.field';
import { GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID } from '../fields/goods-receipt-on-goods-receipt-line.field';

export const GOODS_RECEIPT_LINES_TABLE_VIEW_ID = 'd978a2e1-d6e6-4cbd-9f66-1e6ce0d847dd';

export default defineView({
  universalIdentifier: GOODS_RECEIPT_LINES_TABLE_VIEW_ID,
  name: 'Goods Receipt Lines Table',
  objectUniversalIdentifier: GOODS_RECEIPT_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: 'd1f1c831-9f11-4c29-b708-b4951a4b96d2', fieldMetadataUniversalIdentifier: GOODS_RECEIPT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: 'f8e6fa62-8b8a-4961-a97d-34d83af17778', fieldMetadataUniversalIdentifier: ITEM_ON_GOODS_RECEIPT_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: 'f11a0bf8-6188-42e6-b985-99fcb7a5a10d', fieldMetadataUniversalIdentifier: '206e0800-38e6-4318-95e5-e47daedab81f', position: 2, isVisible: true }, // quantity
    { universalIdentifier: '0b530ae4-42e7-4894-8766-3d472c4a4858', fieldMetadataUniversalIdentifier: 'b3957814-0b46-4d5b-9798-7d20b89de230', position: 3, isVisible: true }, // price
    { universalIdentifier: '6b52bdd7-97de-4c8a-b57d-781be1c1172a', fieldMetadataUniversalIdentifier: 'd0a4e59e-84b8-4f55-ba15-eec8a6e60dbe', position: 4, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
  ],
  filters: [
    {
      universalIdentifier: '8f7a2a81-be2f-4dad-aa3f-3384ecb3097d',
      fieldMetadataUniversalIdentifier: GOODS_RECEIPT_ON_GOODS_RECEIPT_LINE_ID,
      operand: ViewFilterOperand.IS,
      value: '{"selectedRecordIds":[],"isCurrentRecordSelected":true}',
    },
  ],
});
