import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../directories/objects/organization.object';

export const ORGANIZATION_ON_PARTY_LEDGER_ENTRY_ID = 'd69c1f89-c27c-479f-a974-73f2c3d72407';
export const PARTY_LEDGER_ENTRIES_ON_ORGANIZATION_ID = '099a13ae-bd8d-483b-8a28-199a846173f1';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_PARTY_LEDGER_ENTRY_ID,
  objectUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PARTY_LEDGER_ENTRIES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
