import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const WAREHOUSE_ON_GOODS_RECEIPT_ID = '387b630e-7f64-4581-b18b-7dcaece0ee26';
export const GOODS_RECEIPTS_ON_WAREHOUSE_ID = '535a88f7-2466-456d-93c7-36125a50583d';

export default defineField({
  universalIdentifier: WAREHOUSE_ON_GOODS_RECEIPT_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'warehouse',
  label: 'Склад',
  icon: 'IconBuildingWarehouse',
  relationTargetObjectMetadataUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_RECEIPTS_ON_WAREHOUSE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'warehouseId',
  },
});
