import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { ITEM_BALANCE_UNIVERSAL_IDENTIFIER } from '../objects/item-balance.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_ITEM_BALANCE_ID = '40fc7e02-03cc-401f-91d2-3eb66cb42f57';
export const ITEM_BALANCES_ON_ITEM_ID = '6f8ed430-10ad-4ebb-9a1d-84488f2eb05a';

export default defineField({
  universalIdentifier: ITEM_ON_ITEM_BALANCE_ID,
  objectUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_BALANCES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
