import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID = 'ab6cde24-e3d3-4cd0-99fe-d2ae14f7c5dc';
export const STOCK_TRANSFERS_FROM_ON_WAREHOUSE_ID = '59bf3455-3f8c-4cc3-8525-d585771dccfb';

export default defineField({
  universalIdentifier: WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouseFrom',
  label: 'Склад-отправитель',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_TRANSFERS_FROM_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseFromId',
  },
});
