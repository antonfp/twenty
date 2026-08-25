import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export const DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER =
  'fb2c35b8-f5bc-4090-a88b-71afdd9d0daf';

export default defineNavigationMenuItem({
  universalIdentifier: DIRECTORIES_FOLDER_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.FOLDER,
  name: 'Справочники',
  icon: 'IconBooks',
  position: 10,
});
