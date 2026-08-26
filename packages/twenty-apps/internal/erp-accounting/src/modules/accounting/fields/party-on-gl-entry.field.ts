import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';

export const PARTY_ON_GL_ENTRY_ID = '57ff0c84-8eec-4709-a2ef-e4ba758ad9e4';
export const GL_ENTRIES_ON_COMPANY_ID = '7108f7fb-3b23-46da-b9df-d61ec5c98d88';

export default defineField({
  universalIdentifier: PARTY_ON_GL_ENTRY_ID,
  objectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'party',
  label: 'Контрагент',
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: GL_ENTRIES_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'partyId',
  },
});
