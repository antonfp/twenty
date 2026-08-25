import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_ON_GOODS_RECEIPT_ID, GOODS_RECEIPTS_ON_WAREHOUSE_ID } from './warehouse-on-goods-receipt.field';

export default defineField({
  universalIdentifier: GOODS_RECEIPTS_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsReceipts',
  label: 'Поступления товаров',
  icon: 'IconPackageImport',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_ON_GOODS_RECEIPT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
