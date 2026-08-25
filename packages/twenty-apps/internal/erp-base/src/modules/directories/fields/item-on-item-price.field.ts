import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../objects/item.object';
import { ITEM_PRICE_UNIVERSAL_IDENTIFIER } from '../objects/item-price.object';

export const ITEM_ON_ITEM_PRICE_ID = 'f8508faa-fd9d-47dc-ae8c-032f49e893a7';
export const ITEM_PRICES_ON_ITEM_ID = '49190d1f-6366-44d1-b881-3711a55028d7';

export default defineField({
  universalIdentifier: ITEM_ON_ITEM_PRICE_ID,
  objectUniversalIdentifier: ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_PRICES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'itemId',
  },
});
