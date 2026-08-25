import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const SALES_FOLDER_UNIVERSAL_IDENTIFIER =
  'd32c0f34-87bc-44a1-9410-02015eb3ae3e';

export default defineNavigationMenuItem({
  universalIdentifier: SALES_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Продажи',
  icon: 'IconShoppingCart',
  position: 11,
});
