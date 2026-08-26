import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry-line.object';

export const PARTY_ON_MANUAL_ENTRY_LINE_ID = '5021ecfc-00ae-4abc-8d2e-50461b4f99c1';
export const MANUAL_ENTRY_LINES_ON_COMPANY_ID = '2c62f9ac-24e8-4e35-875d-ae2093260cbd';

export default defineField({
  universalIdentifier: PARTY_ON_MANUAL_ENTRY_LINE_ID,
  objectUniversalIdentifier: MANUAL_ENTRY_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'party',
  label: 'Контрагент',
  icon: 'IconBuildingSkyscraper',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: MANUAL_ENTRY_LINES_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'partyId',
  },
});
