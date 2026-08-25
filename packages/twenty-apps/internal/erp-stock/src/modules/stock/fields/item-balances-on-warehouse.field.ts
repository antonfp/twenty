import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { ITEM_BALANCE_UNIVERSAL_IDENTIFIER } from '../objects/item-balance.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_ON_ITEM_BALANCE_ID, ITEM_BALANCES_ON_WAREHOUSE_ID } from './warehouse-on-item-balance.field';

export default defineField({
  universalIdentifier: ITEM_BALANCES_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'itemBalances',
  label: 'Остатки товаров',
  icon: 'IconStack2',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_ON_ITEM_BALANCE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
