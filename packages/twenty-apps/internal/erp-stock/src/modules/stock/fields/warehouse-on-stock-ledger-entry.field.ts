import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_ON_STOCK_LEDGER_ENTRY_ID = 'f1b41314-f364-403b-ae53-f4c7482e6ceb';
export const STOCK_LEDGER_ENTRIES_ON_WAREHOUSE_ID = '5dd1c6ff-e890-451b-aaf0-cad2a9e74c9d';

export default defineField({
  universalIdentifier: WAREHOUSE_ON_STOCK_LEDGER_ENTRY_ID,
  objectUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouse',
  label: 'Склад',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_LEDGER_ENTRIES_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseId',
  },
});
