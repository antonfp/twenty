import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { SALES_SHIPMENT_UNIVERSAL_IDENTIFIER } from '../objects/sales-shipment.object';
import { STOCK_FOLDER_UNIVERSAL_IDENTIFIER } from './stock-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '0cf4c95a-7a9c-4b9e-9da6-960861b50cc0',
  type: NavigationMenuItemType.OBJECT,
  position: 1,
  folderUniversalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
});
