import { AggregateOperations, ViewFilterOperand, defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER, GOODS_WRITE_OFF_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off-line.object';
import { ITEM_ON_GOODS_WRITE_OFF_LINE_ID } from '../fields/item-on-goods-write-off-line.field';
import { GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID } from '../fields/goods-write-off-on-goods-write-off-line.field';

export const GOODS_WRITE_OFF_LINES_TABLE_VIEW_ID = '00cd5fb6-5570-42b0-a5a3-4e53a5390e9f';

export default defineView({
  universalIdentifier: GOODS_WRITE_OFF_LINES_TABLE_VIEW_ID,
  name: 'Goods Write-off Lines Table',
  objectUniversalIdentifier: GOODS_WRITE_OFF_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '82879f56-8d5d-4cd0-883e-cb19b4c90db4', fieldMetadataUniversalIdentifier: GOODS_WRITE_OFF_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: '22758c8a-9408-4c08-837e-66e1d5e30342', fieldMetadataUniversalIdentifier: ITEM_ON_GOODS_WRITE_OFF_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: 'fd160c84-fc86-4655-846e-fded93eb6409', fieldMetadataUniversalIdentifier: '976516dd-9c93-49c4-bd95-0431571bfc7d', position: 2, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // quantity
    { universalIdentifier: '8312b8ab-0d78-4a63-ae38-c8e3604ffac4', fieldMetadataUniversalIdentifier: '909b1bf5-8759-4d42-83f9-e1cb5a078241', position: 3, isVisible: true }, // reason
  ],
  filters: [
    {
      universalIdentifier: 'd8af1ad9-dffe-4a16-b276-f277b0407761',
      fieldMetadataUniversalIdentifier: GOODS_WRITE_OFF_ON_GOODS_WRITE_OFF_LINE_ID,
      operand: ViewFilterOperand.IS,
      value: '{"selectedRecordIds":[],"isCurrentRecordSelected":true}',
    },
  ],
});
