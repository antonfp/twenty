import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import {
  OPPORTUNITY_ON_SALES_INVOICE_ID,
  SALES_INVOICES_ON_OPPORTUNITY_ID,
} from './opportunity-on-sales-invoice.field';

// Reverse side of opportunity — the invoices created from this deal.
export default defineField({
  universalIdentifier: SALES_INVOICES_ON_OPPORTUNITY_ID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'salesInvoices',
  label: 'Счета покупателям',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier:
    SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    OPPORTUNITY_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
