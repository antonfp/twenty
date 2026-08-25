import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID, GOODS_RECEIPTS_ON_SUPPLIER_INVOICE_ID } from './supplier-invoice-on-goods-receipt.field';

export default defineField({
  universalIdentifier: GOODS_RECEIPTS_ON_SUPPLIER_INVOICE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsReceipts',
  label: 'Поступления товаров',
  icon: 'IconPackageImport',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_INVOICE_ON_GOODS_RECEIPT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
