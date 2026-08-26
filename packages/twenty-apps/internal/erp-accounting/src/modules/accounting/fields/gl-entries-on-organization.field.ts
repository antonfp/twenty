import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_GL_ENTRY_ID, GL_ENTRIES_ON_ORGANIZATION_ID } from './organization-on-gl-entry.field';

export default defineField({
  universalIdentifier: GL_ENTRIES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'glEntries',
  label: 'Проводки',
  icon: 'IconBook2',
  relationTargetObjectMetadataUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_GL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
