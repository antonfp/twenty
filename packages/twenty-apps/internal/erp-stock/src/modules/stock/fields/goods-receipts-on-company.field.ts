import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { SUPPLIER_ON_GOODS_RECEIPT_ID, GOODS_RECEIPTS_ON_COMPANY_ID } from './supplier-on-goods-receipt.field';

export default defineField({
  universalIdentifier: GOODS_RECEIPTS_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'goodsReceipts',
  label: 'Поступления товаров',
  icon: 'IconPackageImport',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_ON_GOODS_RECEIPT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
