import { getNavigationCommandUniversalIdentifier } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { EngineComponentKey } from 'src/engine/metadata-modules/command-menu-item/enums/engine-component-key.enum';
import { isObjectNavigationCommandMenuItemPayload } from 'src/engine/metadata-modules/command-menu-item/utils/is-object-navigation-command-menu-item-payload.util';

export type NavigationCommandMenuItemCandidate = {
  universalIdentifier: string;
  engineComponentKey: string | null;
  payload: unknown;
  isSystemSideEffect: boolean;
};

// Matches "a navigation command already targets the object, whatever its
// identifier". Only object-keyed NAVIGATION commands are candidates, so
// path-based NAVIGATION commands and unrelated rows are never matched, even
// when they happen to hold the derived identifier. The payload is the
// authority whenever the object workspace id is known; the derived identifier
// is the fallback for the universal paths, where entity ids are minted after
// side-effect expansion and no payload can be compared.
export const isNavigationCommandMenuItemForObject = ({
  commandMenuItem,
  objectMetadataId,
  derivedUniversalIdentifier,
}: {
  commandMenuItem: NavigationCommandMenuItemCandidate;
  objectMetadataId: string | undefined;
  derivedUniversalIdentifier: string;
}): boolean => {
  if (commandMenuItem.engineComponentKey !== EngineComponentKey.NAVIGATION) {
    return false;
  }

  const payload = commandMenuItem.payload;

  if (!isObjectNavigationCommandMenuItemPayload(payload)) {
    return false;
  }

  if (isDefined(objectMetadataId)) {
    return payload.objectMetadataItemId === objectMetadataId;
  }

  return commandMenuItem.universalIdentifier === derivedUniversalIdentifier;
};

export const findObjectNavigationFlatCommandMenuItem = <
  T extends NavigationCommandMenuItemCandidate,
>({
  commandMenuItems,
  objectMetadataId,
  objectUniversalIdentifier,
  applicationUniversalIdentifier,
}: {
  commandMenuItems: (T | undefined)[];
  objectMetadataId: string | undefined;
  objectUniversalIdentifier: string;
  applicationUniversalIdentifier: string;
}): T | undefined => {
  const derivedUniversalIdentifier = getNavigationCommandUniversalIdentifier({
    applicationUniversalIdentifier,
    objectUniversalIdentifier,
  });

  return commandMenuItems.filter(isDefined).find((commandMenuItem) =>
    isNavigationCommandMenuItemForObject({
      commandMenuItem,
      objectMetadataId,
      derivedUniversalIdentifier,
    }),
  );
};
