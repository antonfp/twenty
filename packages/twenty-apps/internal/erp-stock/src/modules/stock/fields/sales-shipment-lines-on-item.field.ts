import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_SALES_SHIPMENT_LINE_ID, SALES_SHIPMENT_LINES_ON_ITEM_ID } from './item-on-sales-shipment-line.field';

export default defineField({
  universalIdentifier: SALES_SHIPMENT_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesShipmentLines',
  label: 'Строки реализаций товаров',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_SALES_SHIPMENT_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
