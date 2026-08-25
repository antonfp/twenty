import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/stock-ledger-entry.object';
import { STOCK_FOLDER_UNIVERSAL_IDENTIFIER } from './stock-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '06c89f73-a1eb-49bc-b90f-d3f39c3ab15a',
  type: NavigationMenuItemType.OBJECT,
  position: 6,
  folderUniversalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: STOCK_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
});
