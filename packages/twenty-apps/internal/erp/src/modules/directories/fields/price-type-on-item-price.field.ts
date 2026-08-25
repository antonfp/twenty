import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { PRICE_TYPE_UNIVERSAL_IDENTIFIER } from '../objects/price-type.object';
import { ITEM_PRICE_UNIVERSAL_IDENTIFIER } from '../objects/item-price.object';

export const PRICE_TYPE_ON_ITEM_PRICE_ID =
  '68cc23ea-270a-4ca3-860d-4acca16b16df';
export const ITEM_PRICES_ON_PRICE_TYPE_ID =
  'a4c046c1-5da7-4dfd-8238-e92d7f803bcf';

export default defineField({
  universalIdentifier: PRICE_TYPE_ON_ITEM_PRICE_ID,
  objectUniversalIdentifier: ITEM_PRICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'priceType',
  label: 'Вид цен',
  icon: 'IconTag',
  relationTargetObjectMetadataUniversalIdentifier:
    PRICE_TYPE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    ITEM_PRICES_ON_PRICE_TYPE_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'priceTypeId',
  },
});
