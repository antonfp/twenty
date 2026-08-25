import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_GOODS_RECEIPT_ID, GOODS_RECEIPTS_ON_ORGANIZATION_ID } from './organization-on-goods-receipt.field';

export default defineField({
  universalIdentifier: GOODS_RECEIPTS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsReceipts',
  label: 'Поступления товаров',
  icon: 'IconPackageImport',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_RECEIPT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
