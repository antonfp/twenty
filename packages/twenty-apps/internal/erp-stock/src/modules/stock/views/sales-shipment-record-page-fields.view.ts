import { defineView, ViewType } from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { ORGANIZATION_ON_SALES_SHIPMENT_ID } from '../fields/organization-on-sales-shipment.field';
import { WAREHOUSE_ON_SALES_SHIPMENT_ID } from '../fields/warehouse-on-sales-shipment.field';
import { CUSTOMER_ON_SALES_SHIPMENT_ID } from '../fields/customer-on-sales-shipment.field';
import { SALES_INVOICE_ON_SALES_SHIPMENT_ID } from '../fields/sales-invoice-on-sales-shipment.field';

export const SALES_SHIPMENT_RECORD_PAGE_FIELDS_VIEW_ID = '9bd01467-cbfa-4d7d-8031-2a5eb1ab40ab';

export default defineView({
  universalIdentifier: SALES_SHIPMENT_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Sales Shipment Record Page Fields',
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '89cfdc6c-79e7-490a-9f11-73da049faadd', fieldMetadataUniversalIdentifier: 'a6675ae1-7dac-451d-ba59-61823676b2a5', position: 0, isVisible: true }, // number
    { universalIdentifier: 'f24722c6-6254-4bd1-9867-c2e0fa29c49e', fieldMetadataUniversalIdentifier: 'a7fad627-3a7b-41b3-a902-1514954bd1e4', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '8f067db2-e492-4bd9-ae9a-0cef9ae4d883', fieldMetadataUniversalIdentifier: '4b8335f9-8451-4618-933e-8228f23ecbce', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'bda31010-7211-49b5-91ab-e6c54729787e', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_SALES_SHIPMENT_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: 'c48c86c5-51dd-4179-bde9-d0953979ace3', fieldMetadataUniversalIdentifier: WAREHOUSE_ON_SALES_SHIPMENT_ID, position: 4, isVisible: true }, // warehouse
    { universalIdentifier: 'f403a937-9bd7-46b0-9e45-043fa9f96de6', fieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_SHIPMENT_ID, position: 5, isVisible: true }, // customer
    { universalIdentifier: '2f999862-5361-4c80-89db-d6dda652681b', fieldMetadataUniversalIdentifier: SALES_INVOICE_ON_SALES_SHIPMENT_ID, position: 6, isVisible: true }, // salesInvoice
    { universalIdentifier: '462e4058-b471-4dd1-a505-2758cd382764', fieldMetadataUniversalIdentifier: '37a02f0e-c2b6-4252-9c5d-b8cd809f94ca', position: 7, isVisible: true }, // totalCost
    { universalIdentifier: '2209315b-bc37-47ba-bc28-b5b2da4fcf0c', fieldMetadataUniversalIdentifier: 'c4da59c0-5886-4f57-8383-8a22e665df0b', position: 8, isVisible: true }, // comment
    { universalIdentifier: '21d30388-4de3-4bc0-bec1-722a530b23a4', fieldMetadataUniversalIdentifier: 'f7879822-4dac-4351-945c-03aa7cd7d4a6', position: 9, isVisible: true }, // postedAt
    { universalIdentifier: '255e7f22-d86b-4124-bdb0-d02381fe4d17', fieldMetadataUniversalIdentifier: '5cb090a0-e52e-4b40-99fc-fac0c405f2f7', position: 10, isVisible: true }, // cancelledAt
  ],
});
