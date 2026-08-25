import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../directories/objects/organization.object';

export const ORGANIZATION_ON_SALES_INVOICE_ID = '67a0e552-3226-41a1-8918-1723ed62fbb2';
export const SALES_INVOICES_ON_ORGANIZATION_ID = '418b0bdb-3adf-488c-a557-2987c536d93a';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SALES_INVOICES_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
