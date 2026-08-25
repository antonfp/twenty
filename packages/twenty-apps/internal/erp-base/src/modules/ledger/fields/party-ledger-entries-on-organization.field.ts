import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../directories/objects/organization.object';
import { ORGANIZATION_ON_PARTY_LEDGER_ENTRY_ID, PARTY_LEDGER_ENTRIES_ON_ORGANIZATION_ID } from './organization-on-party-ledger-entry.field';

export default defineField({
  universalIdentifier: PARTY_LEDGER_ENTRIES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'partyLedgerEntries',
  label: 'Взаиморасчёты',
  icon: 'IconScale',
  relationTargetObjectMetadataUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_PARTY_LEDGER_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
