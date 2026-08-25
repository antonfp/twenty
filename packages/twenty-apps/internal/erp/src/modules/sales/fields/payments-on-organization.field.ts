import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../directories/objects/organization.object';
import { ORGANIZATION_ON_PAYMENT_ID, PAYMENTS_ON_ORGANIZATION_ID } from './organization-on-payment.field';

export default defineField({
  universalIdentifier: PAYMENTS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'payments',
  label: 'Поступления оплат',
  icon: 'IconCash',
  relationTargetObjectMetadataUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_PAYMENT_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
