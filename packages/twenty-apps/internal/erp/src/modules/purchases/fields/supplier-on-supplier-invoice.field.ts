import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';

export const SUPPLIER_ON_SUPPLIER_INVOICE_ID = '710d0176-cc93-426e-b620-4b6457e37ddc';
export const SUPPLIER_INVOICES_ON_COMPANY_ID = '35a6a481-d0a4-4910-a108-a7ddc96f3d82';

export default defineField({
  universalIdentifier: SUPPLIER_ON_SUPPLIER_INVOICE_ID,
  objectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplier',
  label: 'Поставщик',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_INVOICES_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierId',
  },
});
