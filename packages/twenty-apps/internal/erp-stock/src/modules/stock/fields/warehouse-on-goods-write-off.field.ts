import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER } from '../objects/goods-write-off.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_ON_GOODS_WRITE_OFF_ID = '0bbe9706-16f0-4e1e-ac24-644e2649dd1a';
export const GOODS_WRITE_OFFS_ON_WAREHOUSE_ID = 'a5baaf83-6b59-4922-82cb-3956f6b3de25';

export default defineField({
  universalIdentifier: WAREHOUSE_ON_GOODS_WRITE_OFF_ID,
  objectUniversalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouse',
  label: 'Склад',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_WRITE_OFFS_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseId',
  },
});
