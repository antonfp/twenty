import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_GL_ENTRY_ID = '28224d05-8dad-4faf-8cd2-b64c2954e5b8';
export const GL_ENTRIES_ON_ORGANIZATION_ID = '5856f0e0-907e-47d6-b2e3-733663ac787c';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_GL_ENTRY_ID,
  objectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GL_ENTRIES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
