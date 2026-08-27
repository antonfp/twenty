import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { MONTH_CLOSE_UNIVERSAL_IDENTIFIER } from '../objects/month-close.object';
import { ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER } from './accounting-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'd32fc736-e97f-4408-b744-8fdaf28fc94a',
  type: NavigationMenuItemType.OBJECT,
  position: 3,
  folderUniversalIdentifier: ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: MONTH_CLOSE_UNIVERSAL_IDENTIFIER,
});
