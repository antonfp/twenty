import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER =
  'e9b49fbb-a196-48a0-9db7-9f5e70554f4a';

export default defineNavigationMenuItem({
  universalIdentifier: PURCHASES_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Закупки',
  icon: 'IconShoppingBag',
  position: 12,
});
