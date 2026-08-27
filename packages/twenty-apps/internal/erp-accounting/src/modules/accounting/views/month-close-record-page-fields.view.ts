import { defineView, ViewType } from 'twenty-sdk/define';
import {
  MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  MONTH_CLOSE_PERIOD_FIELD_UNIVERSAL_IDENTIFIER,
  MONTH_CLOSE_IS_YEAR_REFORMATION_FIELD_UNIVERSAL_IDENTIFIER,
} from '../objects/month-close.object';
import { ORGANIZATION_ON_MONTH_CLOSE_ID } from '../fields/organization-on-month-close.field';

export const MONTH_CLOSE_RECORD_PAGE_FIELDS_VIEW_ID = '80231e90-0665-4da3-ab7c-f0d2f52308d8';

export default defineView({
  universalIdentifier: MONTH_CLOSE_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Month Close Record Page Fields',
  objectUniversalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '1a642a99-61dc-4628-a0ec-050a145ca00b', fieldMetadataUniversalIdentifier: 'fc910386-ea4a-4104-ab49-46672eda48c9', position: 0, isVisible: true }, // number
    { universalIdentifier: '1035b3c0-1daf-419e-8843-8c925401a1f6', fieldMetadataUniversalIdentifier: '2a862691-fd5b-4a0f-a93a-6201f12a26de', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: 'dc8b49b4-1620-40ed-9257-4079dc029ca9', fieldMetadataUniversalIdentifier: 'fae854c1-d4ff-441f-8c7c-c0141e810097', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: '7b2515d3-d246-4aaa-ae1c-2fc07dc5bf3e', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_MONTH_CLOSE_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: '8e68ee62-a6d4-404e-b88c-02a17a4a5d3a', fieldMetadataUniversalIdentifier: MONTH_CLOSE_PERIOD_FIELD_UNIVERSAL_IDENTIFIER, position: 4, isVisible: true }, // period
    { universalIdentifier: 'fc1fbff4-910c-4331-9c71-f130377e180d', fieldMetadataUniversalIdentifier: MONTH_CLOSE_IS_YEAR_REFORMATION_FIELD_UNIVERSAL_IDENTIFIER, position: 5, isVisible: true }, // isYearReformation
    { universalIdentifier: '99ea3539-6d1d-499d-97f7-da2b4fd9f98a', fieldMetadataUniversalIdentifier: 'efb9fa76-2686-462c-bd0b-3a4488b5e163', position: 6, isVisible: true }, // comment
    { universalIdentifier: 'ed61d21b-5dbc-4f0d-a9fe-4cc4bf5ab63a', fieldMetadataUniversalIdentifier: '5567d055-7820-4997-96c4-a7ed70993302', position: 7, isVisible: true }, // postedAt
    { universalIdentifier: '9c4c2e39-b3a8-4fe5-876a-127770a27587', fieldMetadataUniversalIdentifier: 'fffd0b76-8efe-4709-a09d-7b034109f375', position: 8, isVisible: true }, // cancelledAt
  ],
});
