import { defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { ORGANIZATION_ON_GOODS_WRITE_OFF_ID } from '../fields/organization-on-goods-write-off.field';
import { WAREHOUSE_ON_GOODS_WRITE_OFF_ID } from '../fields/warehouse-on-goods-write-off.field';

export const GOODS_WRITE_OFF_RECORD_PAGE_FIELDS_VIEW_ID = '3e64a2ea-0567-461d-8bfc-e1eb4a8e26b0';

export default defineView({
  universalIdentifier: GOODS_WRITE_OFF_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Goods Write-off Record Page Fields',
  objectUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '94680cba-e6d9-4e23-8f40-0eaa41878531', fieldMetadataUniversalIdentifier: 'de6da0a7-9093-4b3c-8ded-1410c1b0989c', position: 0, isVisible: true }, // number
    { universalIdentifier: '35c410a0-e28e-42f3-b6bc-eae4f3895527', fieldMetadataUniversalIdentifier: 'efc9eb5f-7636-4718-8d91-c9f357e612f8', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '3d33bf5c-b8e0-498b-b3c3-77ad462049f3', fieldMetadataUniversalIdentifier: '9b7eda18-80fb-46f4-81a1-dd8d3084176e', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: '72814941-1681-4466-9084-0eb9c8906ae2', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_WRITE_OFF_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: '2b74fa58-2c12-4223-a2d7-92bd2d1580d0', fieldMetadataUniversalIdentifier: WAREHOUSE_ON_GOODS_WRITE_OFF_ID, position: 4, isVisible: true }, // warehouse
    { universalIdentifier: 'e72afebd-af87-42ce-9868-ea5329c493e9', fieldMetadataUniversalIdentifier: 'b8b96373-06e4-479e-b549-0aa4a2da1fa0', position: 5, isVisible: true }, // postedAt
    { universalIdentifier: '2b5ac75d-9af0-4a41-8d8a-46d38b144446', fieldMetadataUniversalIdentifier: 'aaa3b7c7-2db2-407d-83fa-07796c141bca', position: 6, isVisible: true }, // cancelledAt
  ],
});
