import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const STOCK_FOLDER_UNIVERSAL_IDENTIFIER =
  '4b14afe6-56a8-4f7d-a5dd-fb645d62b395';

export default defineNavigationMenuItem({
  universalIdentifier: STOCK_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Склад',
  icon: 'IconBuildingWarehouse',
  position: 14,
});
