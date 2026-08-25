import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';

export const PAYER_ON_PAYMENT_ID = '2f2c7c60-7ce8-4f6b-b31d-7ab35583b0b0';
export const PAYMENTS_ON_COMPANY_ID = '52bc5c9b-8424-4d1e-9a9d-1138e23c4358';

export default defineField({
  universalIdentifier: PAYER_ON_PAYMENT_ID,
  objectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'payer',
  label: 'Плательщик',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: PAYMENTS_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'payerId',
  },
});
