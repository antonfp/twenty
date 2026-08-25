import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';
import { COMPANY_ON_PARTY_LEDGER_ENTRY_ID, PARTY_LEDGER_ENTRIES_ON_COMPANY_ID } from './company-on-party-ledger-entry.field';

export default defineField({
  universalIdentifier: PARTY_LEDGER_ENTRIES_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'partyLedgerEntries',
  label: 'Взаиморасчёты',
  icon: 'IconScale',
  relationTargetObjectMetadataUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: COMPANY_ON_PARTY_LEDGER_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
