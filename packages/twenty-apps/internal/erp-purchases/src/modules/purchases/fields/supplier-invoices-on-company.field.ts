import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { SUPPLIER_ON_SUPPLIER_INVOICE_ID, SUPPLIER_INVOICES_ON_COMPANY_ID } from './supplier-on-supplier-invoice.field';

export default defineField({
  universalIdentifier: SUPPLIER_INVOICES_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'supplierInvoices',
  label: 'Счета поставщиков',
  icon: 'IconFileInvoice',
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_ON_SUPPLIER_INVOICE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
