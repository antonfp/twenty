import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { PARTY_ON_GL_ENTRY_ID, GL_ENTRIES_ON_COMPANY_ID } from './party-on-gl-entry.field';

export default defineField({
  universalIdentifier: GL_ENTRIES_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'glEntries',
  label: 'Проводки',
  icon: 'IconBook2',
  relationTargetObjectMetadataUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PARTY_ON_GL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
