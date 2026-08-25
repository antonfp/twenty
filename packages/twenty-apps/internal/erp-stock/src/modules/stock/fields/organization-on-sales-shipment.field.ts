import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_SALES_SHIPMENT_ID = '0f4b9c17-3099-4ec8-bb9c-625ca6d1dfac';
export const SALES_SHIPMENTS_ON_ORGANIZATION_ID = '2e90fc81-f03b-49c4-846b-e1ae313d2b2e';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_SALES_SHIPMENT_ID,
  objectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_SHIPMENTS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
