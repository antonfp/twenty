import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ITEM_BALANCE_UNIVERSAL_IDENTIFIER } from '../objects/item-balance.object';
import { STOCK_FOLDER_UNIVERSAL_IDENTIFIER } from './stock-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '9f5d5e2d-2516-4e72-a972-8b7df9d61db1',
  type: NavigationMenuItemType.OBJECT,
  position: 5,
  folderUniversalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: ITEM_BALANCE_UNIVERSAL_IDENTIFIER,
});
