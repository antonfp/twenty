import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { STOCK_TRANSFER_UNIVERSAL_IDENTIFIER } from '../objects/stock-transfer.object';
import { STOCK_FOLDER_UNIVERSAL_IDENTIFIER } from './stock-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'f9ae63f4-74a7-4f42-904c-e661b5a8e705',
  type: NavigationMenuItemType.OBJECT,
  position: 2,
  folderUniversalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
});
