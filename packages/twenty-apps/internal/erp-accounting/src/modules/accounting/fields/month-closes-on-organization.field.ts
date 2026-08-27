import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { MONTH_CLOSE_UNIVERSAL_IDENTIFIER } from '../objects/month-close.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_MONTH_CLOSE_ID, MONTH_CLOSES_ON_ORGANIZATION_ID } from './organization-on-month-close.field';

export default defineField({
  universalIdentifier: MONTH_CLOSES_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'monthCloses',
  label: 'Закрытия месяца',
  icon: 'IconCalendarCheck',
  relationTargetObjectMetadataUniversalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_MONTH_CLOSE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
