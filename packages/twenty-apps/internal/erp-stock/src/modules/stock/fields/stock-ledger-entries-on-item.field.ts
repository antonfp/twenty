import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ITEM_ON_STOCK_LEDGER_ENTRY_ID, STOCK_LEDGER_ENTRIES_ON_ITEM_ID } from './item-on-stock-ledger-entry.field';

export default defineField({
  universalIdentifier: STOCK_LEDGER_ENTRIES_ON_ITEM_ID,
  objectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'stockLedgerEntries',
  label: 'Движения товаров',
  icon: 'IconTimelineEvent',
  relationTargetObjectMetadataUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ITEM_ON_STOCK_LEDGER_ENTRY_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
