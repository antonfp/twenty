import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_SALES_SHIPMENT_ID, SALES_SHIPMENTS_ON_ORGANIZATION_ID } from './organization-on-sales-shipment.field';

export default defineField({
  universalIdentifier: SALES_SHIPMENTS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesShipments',
  label: 'Реализации товаров',
  icon: 'IconPackageExport',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_SALES_SHIPMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
