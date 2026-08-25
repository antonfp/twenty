import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';

export const SUPPLIER_ON_SUPPLIER_PAYMENT_ID = '43852b4d-4af1-4caa-9cdb-6fef1eda07a7';
export const SUPPLIER_PAYMENTS_ON_COMPANY_ID = '33bc0eef-af15-432d-9a22-d8e05bca9ce5';

export default defineField({
  universalIdentifier: SUPPLIER_ON_SUPPLIER_PAYMENT_ID,
  objectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplier',
  label: 'Поставщик',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: SUPPLIER_PAYMENTS_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierId',
  },
});
