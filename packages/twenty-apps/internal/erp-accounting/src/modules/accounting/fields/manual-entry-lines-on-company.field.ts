import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { PARTY_ON_MANUAL_ENTRY_LINE_ID, MANUAL_ENTRY_LINES_ON_COMPANY_ID } from './party-on-manual-entry-line.field';

export default defineField({
  universalIdentifier: MANUAL_ENTRY_LINES_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'manualEntryLines',
  label: 'Строки ручных операций',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PARTY_ON_MANUAL_ENTRY_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
