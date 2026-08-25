import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER } from '../objects/supplier-payment.object';
import { PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER } from './purchases-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'e5dffec7-dc05-4d47-9ca2-9e62ff25918d',
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  folderUniversalIdentifier: PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
});
