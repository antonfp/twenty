import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/payment.object';
import { SALES_FOLDER_UNIVERSAL_IDENTIFIER } from './sales-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '2dd05d00-5120-4958-a2de-a14e5df094a2',
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  folderUniversalIdentifier: SALES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
});
