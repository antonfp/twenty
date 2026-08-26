import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_GL_ENTRY_ID, GL_ENTRIES_ON_ITEM_ID } from './item-on-gl-entry.field';

export default defineField({
  universalIdentifier: GL_ENTRIES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'glEntries',
  label: 'Проводки',
  icon: 'IconBook2',
  relationTargetObjectMetadataUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_GL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
