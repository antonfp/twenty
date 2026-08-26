import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';
import { CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID, MANUAL_ENTRY_LINES_AS_CREDIT_ON_ACCOUNT_ID } from './credit-account-on-manual-entry-line.field';

export default defineField({
  universalIdentifier: MANUAL_ENTRY_LINES_AS_CREDIT_ON_ACCOUNT_ID,
  objectUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'manualEntryLinesAsCredit',
  label: 'Строки операций (кредит)',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
