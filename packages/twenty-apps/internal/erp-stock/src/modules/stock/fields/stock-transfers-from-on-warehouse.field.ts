import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID, STOCK_TRANSFERS_FROM_ON_WAREHOUSE_ID } from './warehouse-from-on-stock-transfer.field';

export default defineField({
  universalIdentifier: STOCK_TRANSFERS_FROM_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockTransfersFrom',
  label: 'Перемещения (откуда)',
  icon: 'IconTransfer',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_FROM_ON_STOCK_TRANSFER_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
