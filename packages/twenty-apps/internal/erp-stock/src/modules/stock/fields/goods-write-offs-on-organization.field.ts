import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_GOODS_WRITE_OFF_ID, GOODS_WRITE_OFFS_ON_ORGANIZATION_ID } from './organization-on-goods-write-off.field';

export default defineField({
  universalIdentifier: GOODS_WRITE_OFFS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsWriteOffs',
  label: 'Списания товаров',
  icon: 'IconPackageOff',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_WRITE_OFF_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
