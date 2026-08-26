import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_MANUAL_ENTRY_ID, MANUAL_ENTRIES_ON_ORGANIZATION_ID } from './organization-on-manual-entry.field';

export default defineField({
  universalIdentifier: MANUAL_ENTRIES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'manualEntries',
  label: 'Ручные операции',
  icon: 'IconPencilPlus',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_MANUAL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
