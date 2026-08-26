import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER } from './accounting-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'dc8dcc8e-9642-48b0-a72a-5301ac83323c',
  type: NavigationMenuItemType.OBJECT,
  position: 2,
  folderUniversalIdentifier: ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
});
