import { defineView, ViewType } from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { ORGANIZATION_ON_PAYMENT_ID } from '../fields/organization-on-payment.field';
import { PAYER_ON_PAYMENT_ID } from '../fields/payer-on-payment.field';
import { SALES_INVOICE_ON_PAYMENT_ID } from '../fields/sales-invoice-on-payment.field';

export const PAYMENT_RECORD_PAGE_FIELDS_VIEW_ID = 'f82eb398-9b32-411b-b6a0-185d002f346d';

export default defineView({
  universalIdentifier: PAYMENT_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Payment Record Page Fields',
  objectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '9503419c-b967-4c0a-ac99-fddf795bd6cd', fieldMetadataUniversalIdentifier: '2d872cdc-7119-4605-a41e-2b6efe1993d1', position: 0, isVisible: true }, // number
    { universalIdentifier: 'c63d8a47-c0ee-427d-b672-3658eb774e3b', fieldMetadataUniversalIdentifier: 'e5ed42a8-3982-429e-b64d-7f9c5a9785cc', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '491f2c24-fdd8-4eb9-9dc7-e8053f3864f7', fieldMetadataUniversalIdentifier: 'e50d881e-6903-4a3f-a3c0-f3aa0c5842a0', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: 'a77f327e-59b8-4614-b5b5-8315c6967802', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_PAYMENT_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: 'b8079d19-62c7-41b9-9a4a-1eb2ea4ebc26', fieldMetadataUniversalIdentifier: PAYER_ON_PAYMENT_ID, position: 4, isVisible: true }, // payer
    { universalIdentifier: '74e111c4-c1e8-4de8-95a6-bd46452cfae5', fieldMetadataUniversalIdentifier: SALES_INVOICE_ON_PAYMENT_ID, position: 5, isVisible: true }, // salesInvoice
    { universalIdentifier: '6780b839-551d-45e1-88e8-62691670ea6c', fieldMetadataUniversalIdentifier: 'b2cb8d52-8e20-4029-9dc5-9e5b8dc3fd86', position: 6, isVisible: true }, // paymentDate
    { universalIdentifier: 'a14a8ffd-5193-46ac-b904-fdcbbfe2fdb5', fieldMetadataUniversalIdentifier: '7f7cc955-2d17-407e-ad67-6866609806f0', position: 7, isVisible: true }, // amount
    { universalIdentifier: '6ed426aa-aa20-49ac-b418-62491c845087', fieldMetadataUniversalIdentifier: '0ffc1814-d5e4-47bd-b60a-ab3ec159ce70', position: 8, isVisible: true }, // comment
    { universalIdentifier: '80989e04-29ca-4de1-ad16-85307d4af22d', fieldMetadataUniversalIdentifier: 'e866c685-ff6b-4360-af88-ffecda7b0520', position: 9, isVisible: true }, // postedAt
    { universalIdentifier: '754df1c2-b917-4c15-8922-79d5c7dfd296', fieldMetadataUniversalIdentifier: 'e068a399-c1df-4c8b-9181-c9304040f5d8', position: 10, isVisible: true }, // cancelledAt
  ],
});
