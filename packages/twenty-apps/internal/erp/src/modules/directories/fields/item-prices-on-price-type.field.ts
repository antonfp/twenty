import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { PRICE_TYPE_UNIVERSAL_IDENTIFIER } from '../objects/price-type.object';
import { ITEM_PRICE_UNIVERSAL_IDENTIFIER } from '../objects/item-price.object';
import {
  ITEM_PRICES_ON_PRICE_TYPE_ID,
  PRICE_TYPE_ON_ITEM_PRICE_ID,
} from './price-type-on-item-price.field';

export default defineField({
  universalIdentifier: ITEM_PRICES_ON_PRICE_TYPE_ID,
  objectUniversalIdentifier: PRICE_TYPE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'itemPrices',
  label: 'Цены номенклатуры',
  icon: 'IconCoin',
  relationTargetObjectMetadataUniversalIdentifier:
    ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    PRICE_TYPE_ON_ITEM_PRICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
