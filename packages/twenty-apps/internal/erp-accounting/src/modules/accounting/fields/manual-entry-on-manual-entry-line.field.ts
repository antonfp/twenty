import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';

export const MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID = '8a4388ae-143e-4576-b502-9933115cf7fa';
export const LINES_ON_MANUAL_ENTRY_ID = 'd826fbdc-49cc-4992-91eb-0a1fad854512';

export default defineField({
  universalIdentifier: MANUAL_ENTRY_ON_MANUAL_ENTRY_LINE_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'manualEntry',
  label: 'Ручная операция',
  icon: 'IconPencilPlus',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_MANUAL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'manualEntryId',
  },
});
