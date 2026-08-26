import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { ACCOUNT_UNIVERSAL_IDENTIFIER } from '../objects/account.object';
import { ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER } from './accounting-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '3f00a948-a69a-4f38-97f2-8207909c6ede',
  type: NavigationMenuItemType.OBJECT,
  position: 0,
  folderUniversalIdentifier: ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: ACCOUNT_UNIVERSAL_IDENTIFIER,
});
