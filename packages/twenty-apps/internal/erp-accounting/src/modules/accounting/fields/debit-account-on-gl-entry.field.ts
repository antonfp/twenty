import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';

export const DEBIT_ACCOUNT_ON_GL_ENTRY_ID = '55ac4858-e66c-4b5e-8216-71b0d699bd7a';
export const GL_ENTRIES_AS_DEBIT_ON_ACCOUNT_ID = 'dec03154-6316-44e2-b4e4-5e642d97a1b7';

export default defineField({
  universalIdentifier: DEBIT_ACCOUNT_ON_GL_ENTRY_ID,
  objectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'debitAccount',
  label: 'Дебет',
  icon: 'IconListNumbers',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GL_ENTRIES_AS_DEBIT_ON_ACCOUNT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'debitAccountId',
  },
});
