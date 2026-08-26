import { defineView, ViewType } from 'twenty-sdk/define';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { ORGANIZATION_ON_MANUAL_ENTRY_ID } from '../fields/organization-on-manual-entry.field';

export const MANUAL_ENTRY_RECORD_PAGE_FIELDS_VIEW_ID = '8b3fc5ed-5c71-4215-b827-469acfb2b18f';

export default defineView({
  universalIdentifier: MANUAL_ENTRY_RECORD_PAGE_FIELDS_VIEW_ID,
  name: 'Manual Entry Record Page Fields',
  objectUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    { universalIdentifier: '63e3e41d-3d5b-41da-8829-b980b81825ef', fieldMetadataUniversalIdentifier: 'cc381b1d-1395-4448-b68a-323e431144f7', position: 0, isVisible: true }, // number
    { universalIdentifier: '81f0bb39-6510-41b9-b7aa-a18e41c4a2b8', fieldMetadataUniversalIdentifier: 'e17a5ce1-22c3-43ac-ab1c-b489fc71e16f', position: 1, isVisible: true }, // docStatus
    { universalIdentifier: '33f293df-2f5f-4b18-9554-5e2158eefaa7', fieldMetadataUniversalIdentifier: '0671e137-5027-427c-829a-aec59ccba48b', position: 2, isVisible: true }, // postingDate
    { universalIdentifier: '92533feb-b50a-4f94-95aa-bcbc581cc158', fieldMetadataUniversalIdentifier: ORGANIZATION_ON_MANUAL_ENTRY_ID, position: 3, isVisible: true }, // organization
    { universalIdentifier: 'ffcd5d5c-c0c6-4723-bdb9-f1673f9c2753', fieldMetadataUniversalIdentifier: 'f4cebb15-2cc7-46cb-a939-c5997951f6e7', position: 4, isVisible: true }, // comment
    { universalIdentifier: 'b311b241-2eab-4e7a-9fef-d45a72a07eb8', fieldMetadataUniversalIdentifier: 'd04cc68f-d129-445a-a0fa-58c1d029de05', position: 5, isVisible: true }, // postedAt
    { universalIdentifier: '6a73f771-86a6-4ca2-aa7f-2f9f5d702892', fieldMetadataUniversalIdentifier: '5f01d97f-514c-42a9-904b-9b67f44935cd', position: 6, isVisible: true }, // cancelledAt
  ],
});
