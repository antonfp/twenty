import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment-line.object';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';

export const SALES_SHIPMENT_ON_SALES_SHIPMENT_LINE_ID = 'aa98d255-d97e-4d81-8c20-aba49461b00a';
export const LINES_ON_SALES_SHIPMENT_ID = 'c7f5abce-017b-476a-8d2a-307e85d9fa08';

export default defineField({
  universalIdentifier: SALES_SHIPMENT_ON_SALES_SHIPMENT_LINE_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesShipment',
  label: 'Реализация',
  icon: 'IconPackageExport',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_SALES_SHIPMENT_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'salesShipmentId',
  },
});
