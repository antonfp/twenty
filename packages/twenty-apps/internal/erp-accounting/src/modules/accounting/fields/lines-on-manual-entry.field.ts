import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID, LINES_ON_MANUAL_ENTRY_ID } from './manual-entry-on-manual-entry-line.field';

export default defineField({
  universalIdentifier: LINES_ON_MANUAL_ENTRY_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
