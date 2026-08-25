import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_SALES_SHIPMENT_LINE_ID = 'fed81995-b0d5-4bdd-b0f4-054586f2ae68';
export const SALES_SHIPMENT_LINES_ON_ITEM_ID = 'b670dc21-75a1-455a-9837-16e108b8f757';

export default defineField({
  universalIdentifier: ITEM_ON_SALES_SHIPMENT_LINE_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENT_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
