import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER =
  '08cd3a1c-a354-439b-b1e8-517f6b49d173';

export default defineNavigationMenuItem({
  universalIdentifier: ACCOUNTING_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Бухгалтерия',
  icon: 'IconCalculator',
  position: 15,
});
