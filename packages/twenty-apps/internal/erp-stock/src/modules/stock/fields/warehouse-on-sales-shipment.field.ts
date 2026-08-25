import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_ON_SALES_SHIPMENT_ID = 'dc164c19-ef78-41c0-8595-b29bd7edf986';
export const SALES_SHIPMENTS_ON_WAREHOUSE_ID = '05b42cb5-0540-4895-bdff-30a84c84b9aa';

export default defineField({
  universalIdentifier: WAREHOUSE_ON_SALES_SHIPMENT_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouse',
  label: 'Склад',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENTS_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseId',
  },
});
