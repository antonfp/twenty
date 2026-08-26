import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';

export const DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID = 'cb10f2a6-459c-42c3-8272-ff8f30db4d08';
export const MANUAL_ENTRY_LINES_AS_DEBIT_ON_ACCOUNT_ID = '117d389c-a9fb-4166-af0a-5a35bf109e15';

export default defineField({
  universalIdentifier: DEBIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'debitAccount',
  label: 'Дебет',
  icon: 'IconListNumbers',
  relationTargetObjectMetadataUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MANUAL_ENTRY_LINES_AS_DEBIT_ON_ACCOUNT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'debitAccountId',
  },
});
