import { isDefined } from 'twenty-shared/utils';

import { buildNavigationUniversalFlatCommandMenuItem } from 'src/engine/metadata-modules/flat-command-menu-item/utils/build-navigation-flat-command-menu-item.util';
import {
  findObjectNavigationFlatCommandMenuItem,
  type NavigationCommandMenuItemCandidate,
} from 'src/engine/metadata-modules/metadata-side-effect/handlers/utils/find-object-navigation-flat-command-menu-item.util';
import { type UniversalFlatCommandMenuItem } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-command-menu-item.type';

type PositionedNavigationCommandMenuItemCandidate =
  NavigationCommandMenuItemCandidate & {
    position: number;
  };

type ObjectMetadataToProvision = {
  id: string;
  universalIdentifier: string;
  nameSingular: string;
  shortcut: string | null;
};

// Shared by the create handler and the provision-on-enable path of the update
// handler: both mint the same command, and the position contract (synced
// maximum plus the index of the object in the operation batch, so a batch
// never double-books a position) has to hold identically on both. Returns
// undefined only when the engine already owns a command for the object.
export const buildObjectNavigationFlatCommandMenuItemToCreate = ({
  objectMetadata,
  applicationUniversalIdentifier,
  pendingFlatCommandMenuItems,
  syncedFlatCommandMenuItems,
  batchObjectUniversalIdentifiers,
}: {
  objectMetadata: ObjectMetadataToProvision;
  applicationUniversalIdentifier: string;
  pendingFlatCommandMenuItems: (
    | NavigationCommandMenuItemCandidate
    | undefined
  )[];
  syncedFlatCommandMenuItems: (
    | PositionedNavigationCommandMenuItemCandidate
    | undefined
  )[];
  batchObjectUniversalIdentifiers: string[];
}): UniversalFlatCommandMenuItem | undefined => {
  // Only an engine-owned command stands in for the one this handler would
  // mint. A caller row targeting the object must not silence the emission:
  // the engine is the authority for isSystemSideEffect entities, so it emits
  // and the collision detector turns the squat into
  // RESERVED_SYSTEM_UNIVERSAL_IDENTIFIER instead of the engine standing down.
  const existingNavigationFlatCommandMenuItem =
    findObjectNavigationFlatCommandMenuItem({
      commandMenuItems: [
        ...pendingFlatCommandMenuItems,
        ...syncedFlatCommandMenuItems,
      ].filter(
        (flatCommandMenuItem) => flatCommandMenuItem?.isSystemSideEffect,
      ),
      objectMetadataId: objectMetadata.id,
      objectUniversalIdentifier: objectMetadata.universalIdentifier,
      applicationUniversalIdentifier,
    });

  if (isDefined(existingNavigationFlatCommandMenuItem)) {
    return undefined;
  }

  const syncedMaxPosition = syncedFlatCommandMenuItems
    .filter(isDefined)
    .reduce(
      (maxPosition, flatCommandMenuItem) =>
        Math.max(maxPosition, flatCommandMenuItem.position),
      -1,
    );

  const indexInBatch = Math.max(
    batchObjectUniversalIdentifiers.indexOf(objectMetadata.universalIdentifier),
    0,
  );

  return buildNavigationUniversalFlatCommandMenuItem({
    objectMetadata,
    applicationUniversalIdentifier,
    position: syncedMaxPosition + 1 + indexInBatch,
    now: new Date().toISOString(),
  });
};
