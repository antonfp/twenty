import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_GOODS_WRITE_OFF_ID = 'de3cd1ae-e3f4-4a97-859d-33ddd256ed21';
export const GOODS_WRITE_OFFS_ON_ORGANIZATION_ID = '16709b14-62e7-44cf-ab84-4b2a31c41c8b';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_GOODS_WRITE_OFF_ID,
  objectUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_WRITE_OFFS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
