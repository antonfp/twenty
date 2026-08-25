import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_STOCK_TRANSFER_LINE_ID, STOCK_TRANSFER_LINES_ON_ITEM_ID } from './item-on-stock-transfer-line.field';

export default defineField({
  universalIdentifier: STOCK_TRANSFER_LINES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockTransferLines',
  label: 'Строки перемещений товаров',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_STOCK_TRANSFER_LINE_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
