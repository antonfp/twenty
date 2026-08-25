import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../objects/organization.object';
import { DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER } from './directories-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '14a3c3f4-4a91-486d-ab0e-6223554d52e1',
  type: NavigationMenuItemType.OBJECT,
  position: 0,
  folderUniversalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
});
