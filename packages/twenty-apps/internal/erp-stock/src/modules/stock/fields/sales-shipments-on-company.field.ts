import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { CUSTOMER_ON_SALES_SHIPMENT_ID, SALES_SHIPMENTS_ON_COMPANY_ID } from './customer-on-sales-shipment.field';

export default defineField({
  universalIdentifier: SALES_SHIPMENTS_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'salesShipments',
  label: 'Реализации товаров',
  icon: 'IconPackageExport',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_SHIPMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
