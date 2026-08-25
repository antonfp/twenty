import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_STOCK_LEDGER_ENTRY_ID = '85cc6472-e0df-420e-966d-99b135cfcfb2';
export const STOCK_LEDGER_ENTRIES_ON_ITEM_ID = 'f389dad4-dd3d-4747-93c1-d06ba1a6837c';

export default defineField({
  universalIdentifier: ITEM_ON_STOCK_LEDGER_ENTRY_ID,
  objectUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: STOCK_LEDGER_ENTRIES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
