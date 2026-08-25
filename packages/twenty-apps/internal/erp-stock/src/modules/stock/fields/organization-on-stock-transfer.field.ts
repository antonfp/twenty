import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ORGANIZATION_ON_STOCK_TRANSFER_ID = '8cb8caa9-6926-4d5e-aade-ecedf3753fd1';
export const STOCK_TRANSFERS_ON_ORGANIZATION_ID = '2f312f32-269b-48d4-92d1-7ee8e0f7c611';

export default defineField({
  universalIdentifier: ORGANIZATION_ON_STOCK_TRANSFER_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'organization',
  label: 'Организация',
  icon: 'IconBuildingBank',
  relationTargetObjectMetadataUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_TRANSFERS_ON_ORGANIZATION_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'organizationId',
  },
});
