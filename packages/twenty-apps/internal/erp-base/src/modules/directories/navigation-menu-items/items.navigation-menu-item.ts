import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../objects/item.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '54a21308-e16e-4762-8777-a4a9323454e2',
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
});
