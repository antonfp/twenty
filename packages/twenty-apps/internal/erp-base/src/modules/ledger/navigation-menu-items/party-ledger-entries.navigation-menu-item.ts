import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';

// Top-level (no folder): erp-base has no "Продажи" folder of its own — that
// lives in the (dependent) erp-sales app. Position 13 keeps it right after
// Справочники(10)/Продажи(11)/Закупки(12) when all three blocks are installed.
export default defineNavigationMenuItem({
  universalIdentifier: '07c7c280-cd15-493c-bd0b-28bb9c04e396',
  type: NavigationMenuItemType.OBJECT,
  position: 13,
  targetObjectUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
});
