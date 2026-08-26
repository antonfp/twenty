import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';
import { DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID, MANUAL_ENTRY_LINES_AS_DEBIT_ON_ACCOUNT_ID } from './debit-account-on-manual-entry-line.field';

export default defineField({
  universalIdentifier: MANUAL_ENTRY_LINES_AS_DEBIT_ON_ACCOUNT_ID,
  objectUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'manualEntryLinesAsDebit',
  label: 'Строки операций (дебет)',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
