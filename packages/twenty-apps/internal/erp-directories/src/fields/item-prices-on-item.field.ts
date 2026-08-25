import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../objects/item.object';
import { ITEM_PRICE_UNIVERSAL_IDENTIFIER } from '../objects/item-price.object';
import {
  ITEM_ON_ITEM_PRICE_ID,
  ITEM_PRICES_ON_ITEM_ID,
} from './item-on-item-price.field';

export default defineField({
  universalIdentifier: ITEM_PRICES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'itemPrices',
  label: 'Цены',
  icon: 'IconCoin',
  relationTargetObjectMetadataUniversalIdentifier:
    ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_ITEM_PRICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
