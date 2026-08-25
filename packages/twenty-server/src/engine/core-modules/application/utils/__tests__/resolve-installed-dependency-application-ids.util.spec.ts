import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { resolveInstalledDependencyApplicationIds } from 'src/engine/core-modules/application/utils/resolve-installed-dependency-application-ids.util';

const APP_B_UNIVERSAL_IDENTIFIER = 'bbbbbbbb-0000-4000-8000-000000000002';
const APP_B_ID = 'application-b-id';
const APP_C_UNIVERSAL_IDENTIFIER = 'cccccccc-0000-4000-8000-000000000003';

const flatApplicationMaps: FlatApplicationCacheMaps = {
  byId: {},
  idByUniversalIdentifier: {
    [APP_B_UNIVERSAL_IDENTIFIER]: APP_B_ID,
  },
};

describe('resolveInstalledDependencyApplicationIds', () => {
  it('resolves declared dependencies to installed application ids', () => {
    expect(
      resolveInstalledDependencyApplicationIds({
        dependencies: [APP_B_UNIVERSAL_IDENTIFIER],
        flatApplicationMaps,
      }),
    ).toEqual([APP_B_ID]);
  });

  it('skips dependencies that are not installed', () => {
    expect(
      resolveInstalledDependencyApplicationIds({
        dependencies: [APP_B_UNIVERSAL_IDENTIFIER, APP_C_UNIVERSAL_IDENTIFIER],
        flatApplicationMaps,
      }),
    ).toEqual([APP_B_ID]);
  });

  it('returns an empty array for null or undefined dependencies', () => {
    expect(
      resolveInstalledDependencyApplicationIds({
        dependencies: null,
        flatApplicationMaps,
      }),
    ).toEqual([]);
    expect(
      resolveInstalledDependencyApplicationIds({
        dependencies: undefined,
        flatApplicationMaps,
      }),
    ).toEqual([]);
  });
});
