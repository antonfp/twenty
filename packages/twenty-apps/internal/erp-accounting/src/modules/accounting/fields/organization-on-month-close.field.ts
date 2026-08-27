import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { MONTH_CLOSE_UNIVERSAL_IDENTIFIER } from '../objects/month-close.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_MONTH_CLOSE_ID = 'f3caf7b2-63b0-4d48-a2b9-3dc0699d68f1';
export const MONTH_CLOSES_ON_ORGANIZATION_ID = 'f5b4312e-3345-4738-b10b-fcecc44115fc';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_MONTH_CLOSE_ID,
  objectUniversalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MONTH_CLOSES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
