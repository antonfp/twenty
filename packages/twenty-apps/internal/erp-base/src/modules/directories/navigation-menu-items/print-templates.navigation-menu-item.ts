import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER } from '../objects/print-template.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '6537207a-3b79-4c73-8dd8-56d94b69b66a',
  type: NavigationMenuItemType.OBJECT,
  position: 5,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: PRINT_TEMPLATE_UNIVERSAL_IDENTIFIER,
});
