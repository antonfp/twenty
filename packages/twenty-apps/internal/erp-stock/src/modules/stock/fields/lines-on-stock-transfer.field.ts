import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer-line.object';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { STOCK_TRANSFER_ON_STOCK_TRANSFER_LINE_ID, LINES_ON_STOCK_TRANSFER_ID } from './stock-transfer-on-stock-transfer-line.field';

export default defineField({
  universalIdentifier: LINES_ON_STOCK_TRANSFER_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'lines',
  label: 'Строки',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_TRANSFER_ON_STOCK_TRANSFER_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
