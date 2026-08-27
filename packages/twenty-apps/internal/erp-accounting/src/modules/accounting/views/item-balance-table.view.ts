import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';
import {
  ITEM_BALANCE_ACTUAL_QTY_FIELD_ID,
  ITEM_BALANCE_AVG_COST_FIELD_ID,
  ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  ITEM_ON_ITEM_BALANCE_FIELD_ID,
  WAREHOUSE_ON_ITEM_BALANCE_FIELD_ID,
} from '../../../shared/erp-references';

export const ITEM_BALANCE_TABLE_VIEW_ID =
  '6e9d0e6a-6cf0-4d5a-9d0e-7b6c8f2a1e03';

// Дашборд «ERP-сводка», виджет «Остатки товаров» — без фильтра (в т.ч.
// нулевые/отрицательные остатки видны для контроля), сорт по остатку DESC.
export default defineView({
  universalIdentifier: ITEM_BALANCE_TABLE_VIEW_ID,
  name: 'Остатки товаров (дашборд)',
  objectUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE_WIDGET,
  fields: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-3a2b3c4d5e01',
      fieldMetadataUniversalIdentifier: ITEM_ON_ITEM_BALANCE_FIELD_ID,
      position: 0,
      isVisible: true,
    }, // item
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-3a2b3c4d5e02',
      fieldMetadataUniversalIdentifier: WAREHOUSE_ON_ITEM_BALANCE_FIELD_ID,
      position: 1,
      isVisible: true,
    }, // warehouse
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-3a2b3c4d5e03',
      fieldMetadataUniversalIdentifier: ITEM_BALANCE_ACTUAL_QTY_FIELD_ID,
      position: 2,
      isVisible: true,
    }, // actualQty
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-3a2b3c4d5e04',
      fieldMetadataUniversalIdentifier: ITEM_BALANCE_AVG_COST_FIELD_ID,
      position: 3,
      isVisible: true,
    }, // avgCost
  ],
  sorts: [
    {
      universalIdentifier: 'c1d9a0d1-6b8f-4c1a-9f0e-3a2b3c4d5f01',
      fieldMetadataUniversalIdentifier: ITEM_BALANCE_ACTUAL_QTY_FIELD_ID,
      direction: ViewSortDirection.DESC,
    },
  ],
});
