import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment-line.object';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { SALES_SHIPMENT_ON_SALES_SHIPMENT_LINE_ID, LINES_ON_SALES_SHIPMENT_ID } from './sales-shipment-on-sales-shipment-line.field';

export default defineField({
  universalIdentifier: LINES_ON_SALES_SHIPMENT_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENT_ON_SALES_SHIPMENT_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
