import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer-line.object';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';

export const STOCK_TRANSFER_ON_STOCK_TRANSFER_LINE_ID = '0a40a766-0140-4b77-bbfd-4b06c5b3f29f';
export const LINES_ON_STOCK_TRANSFER_ID = '2ebfa4eb-6a86-4642-bd1c-743497192a86';

export default defineField({
  universalIdentifier: STOCK_TRANSFER_ON_STOCK_TRANSFER_LINE_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockTransfer',
  label: 'Перемещение',
  icon: 'IconTransfer',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: LINES_ON_STOCK_TRANSFER_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'stockTransferId',
  },
});
