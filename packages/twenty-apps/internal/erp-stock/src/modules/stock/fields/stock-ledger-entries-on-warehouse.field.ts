import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { WAREHOUSE_ON_STOCK_LEDGER_ENTRY_ID, STOCK_LEDGER_ENTRIES_ON_WAREHOUSE_ID } from './warehouse-on-stock-ledger-entry.field';

export default defineField({
  universalIdentifier: STOCK_LEDGER_ENTRIES_ON_WAREHOUSE_ID,
  objectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockLedgerEntries',
  label: 'Движения товаров',
  icon: 'IconTimelineEvent',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WAREHOUSE_ON_STOCK_LEDGER_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
