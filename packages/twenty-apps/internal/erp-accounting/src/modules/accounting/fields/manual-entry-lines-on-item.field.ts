import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_MANUAL_ENTRY_LINE_ID, MANUAL_ENTRY_LINES_ON_ITEM_ID } from './item-on-manual-entry-line.field';

export default defineField({
  universalIdentifier: MANUAL_ENTRY_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'manualEntryLines',
  label: 'Строки ручных операций',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_MANUAL_ENTRY_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
