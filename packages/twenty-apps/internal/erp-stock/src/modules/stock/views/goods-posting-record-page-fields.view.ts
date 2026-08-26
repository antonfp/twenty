import { defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';
import { ORGANIZATION_ON_GOODS_POSTING_ID } from '../fields/organization-on-goods-posting.field';
import { WAREHOUSE_ON_GOODS_POSTING_ID } from '../fields/warehouse-on-goods-posting.field';

export const GOODS_POSTING_RECORD_PAGE_FIELDS_VIEW_ID = 'b42185bc-f20f-4a2a-a233-a3baba51dbe4';

export default defineView({
  universalIdentifier: GOODS_POSTING_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Goods Posting Record Page Fields',
  objectUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: 'e951398a-aed2-4847-aa63-12a2d32ff789', fieldMetadataUniversalIdentifier: 'fa5519eb-e980-47fd-8b02-d97f7e47b1d1', position: 0, isVisible: true }, // number
    { universalIdentifier: '1ef8041c-f06a-40ec-815b-f2eb22ef678a', fieldMetadataUniversalIdentifier: 'cf160551-97b5-4ec7-959b-cc12a750384c', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: 'e94912fd-b641-4743-bd1b-7146e714ab8c', fieldMetadataUniversalIdentifier: 'abe2c367-4f9f-4fbf-ad27-3d9480feda5c', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'e6113096-6b47-49ce-9bb0-6fceece60e68', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_POSTING_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: '072f37c4-6887-457d-99d6-9a0c05fdd69f', fieldMetadataUniversalIdentifier: WAREHOUSE_ON_GOODS_POSTING_ID, position: 4, isVisible: true }, // warehouse
    { universalIdentifier: '3aadc3ad-fb47-4973-9786-d06716297d74', fieldMetadataUniversalIdentifier: '9c4bca48-ea78-4477-a526-15a8624616fa', position: 5, isVisible: true }, // postedAt
    { universalIdentifier: '01a1d5cc-fc7b-48a3-afcf-503f1ed0b42e', fieldMetadataUniversalIdentifier: '8f3ff7ef-fcb5-4f23-9be3-d935eded47fd', position: 6, isVisible: true }, // cancelledAt
  ],
});
