import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_GOODS_POSTING_ID = '02dc6521-830d-4011-956d-a0ae48319e5f';
export const GOODS_POSTINGS_ON_ORGANIZATION_ID = 'd7565b64-7eba-48c5-880d-f80e678fa7ac';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_GOODS_POSTING_ID,
  objectUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_POSTINGS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
