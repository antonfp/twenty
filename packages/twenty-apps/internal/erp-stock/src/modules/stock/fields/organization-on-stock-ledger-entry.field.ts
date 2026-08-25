import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_STOCK_LEDGER_ENTRY_ID = '35a7c8ca-c687-4ab5-8879-12ef05755ab1';
export const STOCK_LEDGER_ENTRIES_ON_ORGANIZATION_ID = '9bbf604b-efae-4e89-bd1a-eb4ebbd5ae05';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_STOCK_LEDGER_ENTRY_ID,
  objectUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_LEDGER_ENTRIES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
