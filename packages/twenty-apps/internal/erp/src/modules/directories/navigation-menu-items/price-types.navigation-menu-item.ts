import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PRICE_TYPE_UNIVERSAL_IDENTIFIER } from '../objects/price-type.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'c4f5f84f-32e8-452e-8213-dcdcb4afd6b9',
  type: NavigationMenuItemType.OBJECT,
  position: 3,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: PRICE_TYPE_UNIVERSAL_IDENTIFIER,
});
