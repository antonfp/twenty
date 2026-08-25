import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_ON_GOODS_WRITE_OFF_ID, GOODS_WRITE_OFFS_ON_WAREHOUSE_ID } from './warehouse-on-goods-write-off.field';

export default defineField({
  universalIdentifier: GOODS_WRITE_OFFS_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsWriteOffs',
  label: 'Списания товаров',
  icon: 'IconPackageOff',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_ON_GOODS_WRITE_OFF_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
