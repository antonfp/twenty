import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_MANUAL_ENTRY_ID = '38e32a6c-0d2b-4a6e-92c1-c5980cfb621e';
export const MANUAL_ENTRIES_ON_ORGANIZATION_ID = '4f3a0c06-252b-40d2-9544-df48bd1a6827';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_MANUAL_ENTRY_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MANUAL_ENTRIES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
