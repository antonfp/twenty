import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_STOCK_TRANSFER_ID, STOCK_TRANSFERS_ON_ORGANIZATION_ID } from './organization-on-stock-transfer.field';

export default defineField({
  universalIdentifier: STOCK_TRANSFERS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockTransfers',
  label: 'Перемещения товаров',
  icon: 'IconTransfer',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_STOCK_TRANSFER_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
