import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/supplier-invoice.object';
import { PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER } from './purchases-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: 'ad57f0ca-cffa-4a73-a254-72d19f978534',
  type: NavigationMenuItemType.OBJECT,
  position: 0,
  folderUniversalIdentifier: PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
});
