import { defineView, ViewType } from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { ORGANIZATION_ON_STOCK_TRANSFER_ID } from '../fields/organization-on-stock-transfer.field';
import { WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID } from '../fields/warehouse-from-on-stock-transfer.field';
import { WAREHOUSE_TO_ON_STOCK_TRANSFER_ID } from '../fields/warehouse-to-on-stock-transfer.field';

export const STOCK_TRANSFER_RECORD_PAGE_FIELDS_VIEW_ID = '2bc7a92a-977e-499f-b4c0-8ea506eef759';

export default defineView({
  universalIdentifier: STOCK_TRANSFER_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Stock Transfer Record Page Fields',
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '3649cfe2-9800-46a8-9f7a-cab8a8f27cf9', fieldMetadataUniversalIdentifier: '562f1123-5c17-461f-af62-1ac9f157dc83', position: 0, isVisible: true }, // number
    { universalIdentifier: '6e616803-2cae-44c1-b01f-4fa89ab04145', fieldMetadataUniversalIdentifier: '3384ce10-6c72-4a1d-a680-a33c1903dedb', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: 'f8c5e510-b6a4-4022-88d4-b63651076c03', fieldMetadataUniversalIdentifier: 'ad4b2947-2ac1-4c57-9df1-42354e77792b', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'd27f3fac-62c9-4b67-abe5-c4cf565c540d', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_STOCK_TRANSFER_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: 'd29a0100-fc4e-41b6-a5da-5d15aaacf965', fieldMetadataUniversalIdentifier: WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID, position: 4, isVisible: true }, // warehouseFrom
    { universalIdentifier: '2a9047c9-3bd6-4769-b2e9-430b4b83bd9a', fieldMetadataUniversalIdentifier: WAREHOUSE_TO_ON_STOCK_TRANSFER_ID, position: 5, isVisible: true }, // warehouseTo
    { universalIdentifier: '24252376-8147-420a-b3bf-d97c949a60dc', fieldMetadataUniversalIdentifier: '7501aca2-8c4c-4be0-8f65-6346413a2f8b', position: 6, isVisible: true }, // postedAt
    { universalIdentifier: '01d4d81c-a8da-412b-9c18-881392baf378', fieldMetadataUniversalIdentifier: 'f780e683-7e3a-4608-a89b-3349e1003e79', position: 7, isVisible: true }, // cancelledAt
  ],
});
