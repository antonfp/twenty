import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/party-ledger-entry.object';
import { SALES_FOLDER_UNIVERSAL_IDENTIFIER } from './sales-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '07c7c280-cd15-493c-bd0b-28bb9c04e396',
  type: NavigationMenuItemType.OBJECT,
  position: 2,
  folderUniversalIdentifier: SALES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: PARTY_LEDGER_ENTRY_UNIVERSAL_IDENTIFIER,
});
