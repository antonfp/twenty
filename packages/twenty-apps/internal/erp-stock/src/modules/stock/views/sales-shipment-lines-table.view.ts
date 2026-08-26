import { AggregateOperations, defineView, ViewType } from 'twenty-sdk/define';
import { SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER, SALES_SHIPMENT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment-line.object';
import { ITEM_ON_SALES_SHIPMENT_LINE_ID } from '../fields/item-on-sales-shipment-line.field';

export const SALES_SHIPMENT_LINES_TABLE_VIEW_ID = 'bc611995-3edb-4b62-9efc-65be593dcc6f';

export default defineView({
  universalIdentifier: SALES_SHIPMENT_LINES_TABLE_VIEW_ID,
  name: 'Sales Shipment Lines Table',
  objectUniversalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    { universalIdentifier: '10161ff7-68da-45d7-91fb-d3fcf40cb7fd', fieldMetadataUniversalIdentifier: SALES_SHIPMENT_LINE_NAME_FIELD_UNIVERSAL_IDENTIFIER, position: 0, isVisible: true }, // name
    { universalIdentifier: '51be79a9-6b99-4a91-ba42-4e343e558d46', fieldMetadataUniversalIdentifier: ITEM_ON_SALES_SHIPMENT_LINE_ID, position: 1, isVisible: true }, // item
    { universalIdentifier: '71eb38e8-4fc2-4229-a255-da7fe161a45a', fieldMetadataUniversalIdentifier: '7c8176d0-ba77-4f26-adc4-1feafb27551d', position: 2, isVisible: true }, // quantity
    { universalIdentifier: '7bc89efb-2595-4971-a189-a2afdad02f0b', fieldMetadataUniversalIdentifier: '0f093034-5c49-451e-a2b6-3ddd210cbb3f', position: 3, isVisible: true }, // price
    { universalIdentifier: 'f48e9e30-8358-4577-9095-b2366a5126da', fieldMetadataUniversalIdentifier: 'e038c2d6-7241-4344-a7f4-adfc47c9100b', position: 4, isVisible: true }, // vatRate
    { universalIdentifier: '6d5381ba-7b9b-469f-92de-3505141c27c5', fieldMetadataUniversalIdentifier: '2c38f63a-9cd4-4468-a951-a3b638180d1b', position: 5, isVisible: true, aggregateOperation: AggregateOperations.SUM }, // amount
    { universalIdentifier: '52a01bf0-e35a-426e-aa3c-6ee429405996', fieldMetadataUniversalIdentifier: 'a9753b52-65f5-467b-b8fd-0a8299261da7', position: 6, isVisible: true }, // costAmount
  ],
});
