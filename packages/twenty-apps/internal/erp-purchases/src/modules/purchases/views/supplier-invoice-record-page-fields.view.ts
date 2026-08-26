import { defineView, ViewType } from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { ORGANIZATION_ON_SUPPLIER_INVOICE_ID } from '../fields/organization-on-supplier-invoice.field';
import { SUPPLIER_ON_SUPPLIER_INVOICE_ID } from '../fields/supplier-on-supplier-invoice.field';

export const SUPPLIER_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID = 'e0328810-af60-4cb6-99a8-5e5457b0394d';

export default defineView({
  universalIdentifier: SUPPLIER_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Supplier Invoice Record Page Fields',
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '3ede24a4-8fae-45d0-a034-cf49bab206db', fieldMetadataUniversalIdentifier: 'f6a14d24-fc8c-4834-a09a-7153ae8a24f2', position: 0, isVisible: true }, // number
    { universalIdentifier: '28115137-6e70-4daf-bc22-804b93e8dccc', fieldMetadataUniversalIdentifier: '8d6c8cf3-2797-49ac-aa1d-0bfe35dc654e', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '5f1379ed-93d9-45fe-ae8a-2ef450d13e9d', fieldMetadataUniversalIdentifier: 'af719041-0dbf-44cc-8bbf-96f634eb6675', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'd947c45e-7efa-4257-b74f-fbb9cf161dfb', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_SUPPLIER_INVOICE_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: 'cc0d21d1-490b-465d-ab17-3201a1017ba6', fieldMetadataUniversalIdentifier: SUPPLIER_ON_SUPPLIER_INVOICE_ID, position: 4, isVisible: true }, // supplier
    { universalIdentifier: '72f9fa67-e7ae-412f-9675-5479adfaa95b', fieldMetadataUniversalIdentifier: 'dc613483-e35e-4c1b-a698-255535ea7050', position: 5, isVisible: true }, // invoiceDate
    { universalIdentifier: 'b1619f74-80a4-44d7-b413-de9afdf860a1', fieldMetadataUniversalIdentifier: '1f61f532-ca71-425a-951f-65c8d9301342', position: 6, isVisible: true }, // total
    { universalIdentifier: '935b5268-4980-49a5-96ba-bb5f6d7d6f01', fieldMetadataUniversalIdentifier: 'e9274291-e759-4e26-b8af-28f6e66ca746', position: 7, isVisible: true }, // vatTotal
    { universalIdentifier: 'dc847425-5fc6-489c-a8d7-49bb2a22c978', fieldMetadataUniversalIdentifier: 'dafe960d-dd62-4925-8214-6b6a62b64611', position: 8, isVisible: true }, // paymentStatus
    { universalIdentifier: 'd5fc7a08-ab19-46fc-ac39-1fd352fecdbe', fieldMetadataUniversalIdentifier: '1437f080-5638-4321-baf9-dc27df3e2354', position: 9, isVisible: true }, // paidAmount
    { universalIdentifier: '878c9589-fa9a-4a14-b601-88ce9864f239', fieldMetadataUniversalIdentifier: '75609e74-5ad6-4f7c-ab32-46dffa46b766', position: 10, isVisible: true }, // comment
    { universalIdentifier: '05d98b9d-28cb-4068-9603-216ea79f781b', fieldMetadataUniversalIdentifier: '08878e5b-85bb-4fce-80db-8888e181d34f', position: 11, isVisible: true }, // postedAt
    { universalIdentifier: 'bd0cd38e-040d-4c3a-be84-b6a88d674b74', fieldMetadataUniversalIdentifier: '994148d5-cbb3-48d4-b904-ce40f1cf2dbd', position: 12, isVisible: true }, // cancelledAt
  ],
});
