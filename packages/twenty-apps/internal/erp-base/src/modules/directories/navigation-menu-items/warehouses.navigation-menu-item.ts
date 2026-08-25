import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { WAREHOUSE_UNIVERSAL_IDENTIFIER } from '../objects/warehouse.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '9e965982-7145-4227-9bb0-edd07e2f03bc',
  type: NavigationMenuItemType.OBJECT,
  position: 2,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
});
