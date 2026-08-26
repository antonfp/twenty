import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';
import { DEBIT_ACCOUNT_ON_GL_ENTRY_ID, GL_ENTRIES_AS_DEBIT_ON_ACCOUNT_ID } from './debit-account-on-gl-entry.field';

export default defineField({
  universalIdentifier: GL_ENTRIES_AS_DEBIT_ON_ACCOUNT_ID,
  objectUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'glEntriesAsDebit',
  label: 'Проводки (дебет)',
  icon: 'IconBook2',
  relationTargetObjectMetadataUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: DEBIT_ACCOUNT_ON_GL_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
