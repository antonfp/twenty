import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer-line.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_STOCK_TRANSFER_LINE_ID = '289edc79-96d5-48ba-aaf8-ab9866856c80';
export const STOCK_TRANSFER_LINES_ON_ITEM_ID = 'fc827de6-a5b5-438e-8eb2-b40df56c785b';

export default defineField({
  universalIdentifier: ITEM_ON_STOCK_TRANSFER_LINE_ID,
  objectUniversalIdentifier: STOCK_TRANSFER_LINE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_TRANSFER_LINES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
