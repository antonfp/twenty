import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ITEM_PRICE_UNIVERSAL_IDENTIFIER } from '../objects/item-price.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'a53dda13-a965-43f2-946e-0d7dacba5c96',
  type: NavigationMenuItemType.OBJECT,
  position: 4,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: ITEM_PRICE_UNIVERSAL_IDENTIFIER,
});
