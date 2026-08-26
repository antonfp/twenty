import { defineView, ViewType } from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { ORGANIZATION_ON_GOODS_RECEIPT_ID } from '../fields/organization-on-goods-receipt.field';
import { WAREHOUSE_ON_GOODS_RECEIPT_ID } from '../fields/warehouse-on-goods-receipt.field';
import { SUPPLIER_ON_GOODS_RECEIPT_ID } from '../fields/supplier-on-goods-receipt.field';
import { SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID } from '../fields/supplier-invoice-on-goods-receipt.field';

export const GOODS_RECEIPT_RECORD_PAGE_FIELDS_VIEW_ID = 'dfbe03f6-ac39-4f0e-ab5c-7a42638e990f';

export default defineView({
  universalIdentifier: GOODS_RECEIPT_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Goods Receipt Record Page Fields',
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '0b9deb89-dd53-4e58-9f7d-acd1a9a34d6e', fieldMetadataUniversalIdentifier: '303ad686-0283-4b8b-9fec-9694dbfaddac', position: 0, isVisible: true }, // number
    { universalIdentifier: '05875bb2-23cb-4547-9b0f-fc3b0e247c27', fieldMetadataUniversalIdentifier: 'c2c68aad-b494-41d0-b1fd-a5b0c608fac4', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '525df1b5-1337-4742-9acb-71c633e5ef88', fieldMetadataUniversalIdentifier: '56070b9f-fb61-4d0e-9b30-335eaea2f9c1', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: '2979ea79-31a3-4acc-9b7f-85ea9ad5bc39', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_RECEIPT_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: '69b3a43b-d956-47a9-a3eb-a0a56a94c83d', fieldMetadataUniversalIdentifier: WAREHOUSE_ON_GOODS_RECEIPT_ID, position: 4, isVisible: true }, // warehouse
    { universalIdentifier: '2fd8500e-8704-47b4-8b54-c77c657f8ada', fieldMetadataUniversalIdentifier: SUPPLIER_ON_GOODS_RECEIPT_ID, position: 5, isVisible: true }, // supplier
    { universalIdentifier: '8a5f4965-13e8-4cf4-96dc-c3c218a0974a', fieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID, position: 6, isVisible: true }, // supplierInvoice
    { universalIdentifier: '35d9dfbe-b2ea-48b1-8a38-0572c78397e5', fieldMetadataUniversalIdentifier: '070af511-9f0b-4783-8a38-f59d57aed56f', position: 7, isVisible: true }, // total
    { universalIdentifier: 'b64547af-217f-4fde-81f7-32769b7f05da', fieldMetadataUniversalIdentifier: '12e4cea3-3b58-4c3f-ac51-c0e7198d1e9d', position: 8, isVisible: true }, // comment
    { universalIdentifier: '523a4bb8-250c-43b9-8be0-32436bc41c15', fieldMetadataUniversalIdentifier: 'c98ab3f9-dd05-4963-815a-d984778fc3ed', position: 9, isVisible: true }, // postedAt
    { universalIdentifier: 'df12bdc6-4db9-43f9-9b43-d87746318626', fieldMetadataUniversalIdentifier: '5d999eb4-e277-4175-b170-4ae2ede41a43', position: 10, isVisible: true }, // cancelledAt
  ],
});
