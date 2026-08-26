import { AggregateOperations, defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER, GOODS_POSTING_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting-line.object';
import { ITEM_ON_GOODS_POSTING_LINE_ID } from '../fields/item-on-goods-posting-line.field';

export const GOODS_POSTING_LINES_TABLE_VIEW_ID = '9fce161c-eb51-4f1a-a305-69224f6331ca';

export default defineView({
  universalIdentifier: GOODS_POSTING_LINES_TABLE_VIEW_ID,
  name: 'Goods Posting Lines Table',
  objectUniversalIdentifier: GOODS_POSTING_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '8ed24034-e21e-432b-b6de-42a85c721cd9', fieldMetadataUniversalIdentifier: GOODS_POSTING_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: '9f03df4a-22cd-4e07-8c1b-6437c414f958', fieldMetadataUniversalIdentifier: ITEM_ON_GOODS_POSTING_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: '647a5d64-567e-4898-bccc-fced0148190e', fieldMetadataUniversalIdentifier: '0916b3ab-48bf-4e0d-ae8f-2d6791ed828c', position: 2, isVisible: true }, // quantity
    { universalIdentifier: '556072f6-ed78-4b2b-85e7-8b8407307e21', fieldMetadataUniversalIdentifier: '414e7ab5-84b8-4855-849f-9f5e06c4813d', position: 3, isVisible: true }, // price
    { universalIdentifier: 'f67ec366-4784-4a13-a604-c5e1bf99cf50', fieldMetadataUniversalIdentifier: '223af412-a00f-4340-942f-f8a68b46cf15', position: 4, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
  ],
});
