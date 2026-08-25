import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_ON_SALES_SHIPMENT_ID, SALES_SHIPMENTS_ON_WAREHOUSE_ID } from './warehouse-on-sales-shipment.field';

export default defineField({
  universalIdentifier: SALES_SHIPMENTS_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesShipments',
  label: 'Реализации товаров',
  icon: 'IconPackageExport',
  relationTargetObjectMetadataUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_ON_SALES_SHIPMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
