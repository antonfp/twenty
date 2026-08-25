import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';

export const COMPANY_ON_PARTY_LEDGER_ENTRY_ID = 'f0bbcd0c-af92-44f7-8224-b3d17e763b5b';
export const PARTY_LEDGER_ENTRIES_ON_COMPANY_ID = '0ec2ece7-ca3b-432a-ab05-c7c27297c5c7';

export default defineField({
  universalIdentifier: COMPANY_ON_PARTY_LEDGER_ENTRY_ID,
  objectUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'company',
  label: 'Контрагент',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PARTY_LEDGER_ENTRIES_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'companyId',
  },
});
