import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { PAYER_ON_PAYMENT_ID, PAYMENTS_ON_COMPANY_ID } from './payer-on-payment.field';

export default defineField({
  universalIdentifier: PAYMENTS_ON_COMPANY_ID,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'payments',
  label: 'Поступления оплат',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PAYER_ON_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
