import { AggregateOperations, defineView, ViewType } from 'twenty-sdk/define';
import { STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER, STOCK_TRANSFER_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer-line.object';
import { ITEM_ON_STOCK_TRANSFER_LINE_ID } from '../fields/item-on-stock-transfer-line.field';

export const STOCK_TRANSFER_LINES_TABLE_VIEW_ID = '812a29ca-b0fb-4342-b399-3ed41b6a6b6d';

export default defineView({
  universalIdentifier: STOCK_TRANSFER_LINES_TABLE_VIEW_ID,
  name: 'Stock Transfer Lines Table',
  objectUniversalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '2b132456-edea-42a6-9508-003e3d81a0c0', fieldMetadataUniversalIdentifier: STOCK_TRANSFER_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: 'f6064340-b20d-4834-833f-424b26ea1136', fieldMetadataUniversalIdentifier: ITEM_ON_STOCK_TRANSFER_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: '6a7aa8c3-ec4f-4dab-b000-b03df94e1cea', fieldMetadataUniversalIdentifier: '19ffe184-a4c9-4ed9-b98e-7c6c3923589b', position: 2, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // quantity
  ],
});
