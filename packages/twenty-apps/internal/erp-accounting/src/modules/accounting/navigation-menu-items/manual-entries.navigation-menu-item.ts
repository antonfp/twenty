import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { MANUAL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/manual-entry.object';
import { ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER } from './accounting-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'f54f95a2-bf92-47dc-b8a7-a89cffb06d8d',
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  folderUniversalIdentifier: ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: MANUAL_ENTRY_UNIVERSAL_IDENTIFIER,
});
