import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { ITEM_BALANCE_UNIVERSAL_IDENTIFIER } from '../objects/item-balance.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_ON_ITEM_BALANCE_ID = '9005f4ec-0b3e-438e-a8df-a07549398c11';
export const ITEM_BALANCES_ON_WAREHOUSE_ID = '0784f028-c3b7-4b91-85e9-8bb29c5a1c91';

export default defineField({
  universalIdentifier: WAREHOUSE_ON_ITEM_BALANCE_ID,
  objectUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouse',
  label: 'Склад',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_BALANCES_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseId',
  },
});
