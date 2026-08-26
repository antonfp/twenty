import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';

export const CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID = '1288a49f-94c5-4d04-be03-259f897fe451';
export const MANUAL_ENTRY_LINES_AS_CREDIT_ON_ACCOUNT_ID = '3d3c8278-aadf-46e2-aa3b-56f141c092e2';

export default defineField({
  universalIdentifier: CREDIT_ACCOUNT_ON_MANUAL_ENTRY_LINE_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'creditAccount',
  label: 'Кредит',
  icon: 'IconListNumbers',
  relationTargetObjectMetadataUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MANUAL_ENTRY_LINES_AS_CREDIT_ON_ACCOUNT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'creditAccountId',
  },
});
