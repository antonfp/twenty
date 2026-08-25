import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-base-references';
import { ORGANIZATION_ON_SALES_INVOICE_ID, SALES_INVOICES_ON_ORGANIZATION_ID } from './organization-on-sales-invoice.field';

export default defineField({
  universalIdentifier: SALES_INVOICES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'salesInvoices',
  label: 'Счета покупателям',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_SALES_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
