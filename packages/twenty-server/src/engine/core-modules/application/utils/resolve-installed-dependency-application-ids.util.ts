import { isDefined } from 'twenty-shared/utils';

import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';

// Dependencies not installed in the workspace are silently skipped here:
// install/sync validation rejects missing dependencies upfront, so this
// resolver only widens visibility to what actually exists.
export const resolveInstalledDependencyApplicationIds = ({
  dependencies,
  flatApplicationMaps,
}: {
  dependencies: string[] | null | undefined;
  flatApplicationMaps: FlatApplicationCacheMaps;
}): string[] =>
  (dependencies ?? [])
    .map(
      (universalIdentifier) =>
        flatApplicationMaps.idByUniversalIdentifier[universalIdentifier],
    )
    .filter(isDefined);
