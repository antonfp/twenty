import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';

export const CREDIT_ACCOUNT_ON_GL_ENTRY_ID = '6d6fc826-3b96-42a9-9c82-991af46a5cff';
export const GL_ENTRIES_AS_CREDIT_ON_ACCOUNT_ID = '11591780-ca26-495f-ab58-d9ccb0c63388';

export default defineField({
  universalIdentifier: CREDIT_ACCOUNT_ON_GL_ENTRY_ID,
  objectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'creditAccount',
  label: 'Кредит',
  icon: 'IconListNumbers',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GL_ENTRIES_AS_CREDIT_ON_ACCOUNT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'creditAccountId',
  },
});
