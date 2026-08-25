import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../directories/objects/organization.object';

export const ORGANIZATION_ON_SUPPLIER_PAYMENT_ID = '6b40f29f-e7d9-4f09-a613-440798b4f09e';
export const SUPPLIER_PAYMENTS_ON_ORGANIZATION_ID = 'af43b5d0-331b-4ea6-a589-ae732960d846';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_SUPPLIER_PAYMENT_ID,
  objectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_PAYMENTS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
