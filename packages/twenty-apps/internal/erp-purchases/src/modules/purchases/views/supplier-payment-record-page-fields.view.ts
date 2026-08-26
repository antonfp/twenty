import { defineView, ViewType } from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { ORGANIZATION_ON_SUPPLIER_PAYMENT_ID } from '../fields/organization-on-supplier-payment.field';
import { SUPPLIER_ON_SUPPLIER_PAYMENT_ID } from '../fields/supplier-on-supplier-payment.field';
import { SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID } from '../fields/supplier-invoice-on-supplier-payment.field';

export const SUPPLIER_PAYMENT_RECORD_PAGE_FIELDS_VIEW_ID = '9bf32ac7-e8bc-4c28-a11f-ae7ac0a045f6';

export default defineView({
  universalIdentifier: SUPPLIER_PAYMENT_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Supplier Payment Record Page Fields',
  objectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '9ef362be-eaa4-42a9-8656-eae80b0b0448', fieldMetadataUniversalIdentifier: '22cf7549-58cc-480c-bf2e-92ca70d6a93a', position: 0, isVisible: true }, // number
    { universalIdentifier: 'ce23253c-c794-48ea-bdb9-278a7fbb6c2c', fieldMetadataUniversalIdentifier: '3bd7d2db-b704-4cf6-a8d4-37a5528ebc63', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: 'ad18fb0f-3c9d-4c07-8d80-47035f635f3b', fieldMetadataUniversalIdentifier: 'ded60362-3e3d-43ce-bb49-461980439e88', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'b8edf5a5-c6e5-4f2c-9227-82c243a6f66d', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_SUPPLIER_PAYMENT_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: '9ad39114-d98f-465d-b203-37bbab14c6e6', fieldMetadataUniversalIdentifier: SUPPLIER_ON_SUPPLIER_PAYMENT_ID, position: 4, isVisible: true }, // supplier
    { universalIdentifier: '21fa5312-86cb-4894-bf25-672a48e61749', fieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_ON_SUPPLIER_PAYMENT_ID, position: 5, isVisible: true }, // supplierInvoice
    { universalIdentifier: '8b5241bd-4fa9-4f2b-933d-fea6b41a3635', fieldMetadataUniversalIdentifier: '51d5b6b8-67ed-457e-bc7c-b26f01e67c23', position: 6, isVisible: true }, // paymentDate
    { universalIdentifier: '01effae4-cd25-45dd-b9a7-2e177f1a8f4e', fieldMetadataUniversalIdentifier: 'd750ffff-1c7e-48e9-85e7-1fef892563eb', position: 7, isVisible: true }, // amount
    { universalIdentifier: 'c4252f36-7a3f-4ce4-a9e9-e2ff259e8841', fieldMetadataUniversalIdentifier: '891f76f1-f995-4c7a-9426-b978053050f4', position: 8, isVisible: true }, // comment
    { universalIdentifier: '662f757e-6f9b-446d-b266-d2b081cf4bf8', fieldMetadataUniversalIdentifier: '81bab479-09dd-47d2-8a1f-43bbeeb37c55', position: 9, isVisible: true }, // postedAt
    { universalIdentifier: 'c690a9bc-df92-478c-a752-0dc647b32c58', fieldMetadataUniversalIdentifier: 'a6614a4c-45ed-45f6-93a8-adbb97eaa02a', position: 10, isVisible: true }, // cancelledAt
  ],
});
