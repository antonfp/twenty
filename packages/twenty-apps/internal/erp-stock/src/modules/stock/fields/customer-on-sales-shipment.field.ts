import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';

export const CUSTOMER_ON_SALES_SHIPMENT_ID = '8c32f262-fadf-40e6-8fca-42e33c047e99';
export const SALES_SHIPMENTS_ON_COMPANY_ID = 'c5bee4c6-85cb-4e04-bd9e-300f86d32ecd';

export default defineField({
  universalIdentifier: CUSTOMER_ON_SALES_SHIPMENT_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'customer',
  label: 'Покупатель',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENTS_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'customerId',
  },
});
