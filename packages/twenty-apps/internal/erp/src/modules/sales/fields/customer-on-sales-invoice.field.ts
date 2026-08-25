import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';

export const CUSTOMER_ON_SALES_INVOICE_ID = '1b2ac653-079c-41ca-8f91-9e6cf648f533';
export const SALES_INVOICES_ON_COMPANY_ID = '582a53ec-1887-402d-a93d-1c51d44eeba7';

export default defineField({
  universalIdentifier: CUSTOMER_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'customer',
  label: 'Покупатель',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: SALES_INVOICES_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'customerId',
  },
});
