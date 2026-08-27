import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';

// Glue Сделка→Счёт (Task 8): cross-app link to the CRM `opportunity` object
// (twenty-standard-application, not an erp-* app — no dependency needed, same
// as `customer` → company below). SET_NULL: deleting the deal must never
// block or cascade onto the invoice it produced.
export const OPPORTUNITY_ON_SALES_INVOICE_ID =
  'e247d753-a0ff-47a6-bf77-8bbeb84b73db';
export const SALES_INVOICES_ON_OPPORTUNITY_ID =
  'f18efbb2-5aaf-4c9d-ad71-46d982972ff8';

export default defineField({
  universalIdentifier: OPPORTUNITY_ON_SALES_INVOICE_ID,
  objectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'opportunity',
  label: 'Из сделки',
  description: 'Сделка CRM, из которой создан этот счёт',
  icon: 'IconTargetArrow',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    SALES_INVOICES_ON_OPPORTUNITY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'opportunityId',
  },
});
