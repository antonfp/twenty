import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { SALES_INVOICE_UNIVERSAL_IDENTIFIER } from '../objects/sales-invoice.object';
import { SALES_FOLDER_UNIVERSAL_IDENTIFIER } from './sales-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '95bfd483-3918-47e5-955f-a05f32cf84a3',
  type: NavigationMenuItemType.OBJECT,
  position: 0,
  folderUniversalIdentifier: SALES_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
});
