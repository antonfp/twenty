import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { CUSTOMER_ON_SALES_INVOICE_ID, SALES_INVOICES_ON_COMPANY_ID } from './customer-on-sales-invoice.field';

export default defineField({
  universalIdentifier: SALES_INVOICES_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'salesInvoices',
  label: 'Счета покупателям',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: CUSTOMER_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
