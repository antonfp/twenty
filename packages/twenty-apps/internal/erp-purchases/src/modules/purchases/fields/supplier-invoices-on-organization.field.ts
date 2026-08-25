import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-base-references';
import { ORGANIZATION_ON_SUPPLIER_INVOICE_ID, SUPPLIER_INVOICES_ON_ORGANIZATION_ID } from './organization-on-supplier-invoice.field';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplierInvoices',
  label: 'Счета поставщиков',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_SUPPLIER_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
