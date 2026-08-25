import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';
import { STOCK_FOLDER_UNIVERSAL_IDENTIFIER } from './stock-folder.navigation-menu-item';

export default defineNavigationMenuItem({
  universalIdentifier: '88258ab8-b8cf-4f38-8455-ea1627935d5d',
  type: NavigationMenuItemType.OBJECT,
  position: 0,
  folderUniversalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  targetObjectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
});
