import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_TO_ON_STOCK_TRANSFER_ID = 'bed1e59b-0492-4cff-8909-e9da9c910a3e';
export const STOCK_TRANSFERS_TO_ON_WAREHOUSE_ID = '812c2ce9-ebc3-4d86-bac4-3c9d3e13c08a';

export default defineField({
  universalIdentifier: WAREHOUSE_TO_ON_STOCK_TRANSFER_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouseTo',
  label: 'Склад-получатель',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_TRANSFERS_TO_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseToId',
  },
});
