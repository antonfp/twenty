import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-base-references';

export const ORGANIZATION_ON_PAYMENT_ID = 'd41340c5-03b8-4834-bca3-d04f32dafe6f';
export const PAYMENTS_ON_ORGANIZATION_ID = '6fde9434-f409-497a-8cfd-9652e09eec31';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_PAYMENT_ID,
  objectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PAYMENTS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
