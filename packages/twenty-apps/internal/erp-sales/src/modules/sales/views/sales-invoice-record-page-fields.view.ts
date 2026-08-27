import { defineView, ViewType } from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { ORGANIZATION_ON_SALES_INVOICE_ID } from '../fields/organization-on-sales-invoice.field';
import { CUSTOMER_ON_SALES_INVOICE_ID } from '../fields/customer-on-sales-invoice.field';
import { AMENDED_FROM_ON_SALES_INVOICE_ID } from '../fields/amended-from-on-sales-invoice.field';

export const SALES_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID =
  '1a7a5b26-f8a2-4604-bad0-8ffd2d8d636c';

export default defineView({
  universalIdentifier: SALES_INVOICE_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Sales Invoice Record Page Fields',
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    {
      universalIdentifier: '2f5cfc9b-4277-4322-ade3-6dbf8966cc44',
      fieldMetadataUniversalIdentifier: '74459548-3a21-41a8-91f1-a322b37e85bb',
      position: 0,
      isVisible: true,
    }, // number
    {
      universalIdentifier: 'e07d5fd5-f3b6-41b7-a5f1-0274b44fe2ca',
      fieldMetadataUniversalIdentifier: '8a1d95c3-ba12-44c6-aace-abe05d7d5e48',
      position: 1,
      isVisible: true,
    }, // docStatus
    {
      universalIdentifier: '7e87e4a9-a836-4ff3-8cc7-3c18ac46bef1',
      fieldMetadataUniversalIdentifier: '71ecde44-156b-4b7a-9d4b-f797d5cc2072',
      position: 2,
      isVisible: true,
    }, // postingDate
    {
      universalIdentifier: '415c522f-1719-4c8c-9bca-f4e2264ce52d',
      fieldMetadataUniversalIdentifier: ORGANIZATION_ON_SALES_INVOICE_ID,
      position: 3,
      isVisible: true,
    }, // organization
    {
      universalIdentifier: '85dfec74-baba-47c0-a6a8-aab5b1106798',
      fieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_INVOICE_ID,
      position: 4,
      isVisible: true,
    }, // customer
    {
      universalIdentifier: '7217ee14-e389-4ce6-8ec2-3d1a5e4138f6',
      fieldMetadataUniversalIdentifier: '0835ef49-a3f4-40e9-9b39-9d177ec259e2',
      position: 5,
      isVisible: true,
    }, // invoiceDate
    {
      universalIdentifier: 'fbc564e0-96db-4990-ae95-90c3b24b29b3',
      fieldMetadataUniversalIdentifier: '727dba6b-d14c-4dda-acc2-28b9096e7484',
      position: 6,
      isVisible: true,
    }, // total
    {
      universalIdentifier: 'ffdc45c6-b0e2-4bdd-8dba-8ac9befaac83',
      fieldMetadataUniversalIdentifier: '9ddeca99-d6a0-41fa-a69d-333aae9bdd0d',
      position: 7,
      isVisible: true,
    }, // vatTotal
    {
      universalIdentifier: '4c0c3ba7-de2a-4d78-a607-38303705d68b',
      fieldMetadataUniversalIdentifier: '2b4f5c31-f2bd-4bcb-be00-acf7a15eeb4d',
      position: 8,
      isVisible: true,
    }, // paymentStatus
    {
      universalIdentifier: '9db6e9ed-fe07-4b4f-b9c1-ac6d871677b9',
      fieldMetadataUniversalIdentifier: 'a8f0f2a1-61ac-42e1-80ac-2932813029c0',
      position: 9,
      isVisible: true,
    }, // paidAmount
    {
      universalIdentifier: '80ae291b-46a7-432f-be2b-b49df45bbadb',
      fieldMetadataUniversalIdentifier: 'b43ed94a-6c64-4939-bfcc-464a27cd6c8b',
      position: 10,
      isVisible: true,
    }, // comment
    {
      universalIdentifier: '0e2ef398-6468-4993-bfaa-64a795e387b9',
      fieldMetadataUniversalIdentifier: 'ee09c6fc-2be5-4b36-be59-89267215a9c3',
      position: 11,
      isVisible: true,
    }, // postedAt
    {
      universalIdentifier: '5b053081-3035-4a9b-ba3d-9b2a8539d8b0',
      fieldMetadataUniversalIdentifier: '2af3a8fe-9db4-4d6a-9b9d-4eda08ba97ca',
      position: 12,
      isVisible: true,
    }, // cancelledAt
    {
      universalIdentifier: 'ee8c63e3-d8a2-4108-bb13-a52b41319bf1',
      fieldMetadataUniversalIdentifier: AMENDED_FROM_ON_SALES_INVOICE_ID,
      position: 13,
      isVisible: true,
    }, // amendedFrom
    {
      universalIdentifier: '38080f4f-cf45-43ff-be40-fedc75618d44',
      fieldMetadataUniversalIdentifier: 'caeb0dc9-5217-4ac6-833a-396a17a0c229',
      position: 14,
      isVisible: true,
    }, // revisionNumber
  ],
});
