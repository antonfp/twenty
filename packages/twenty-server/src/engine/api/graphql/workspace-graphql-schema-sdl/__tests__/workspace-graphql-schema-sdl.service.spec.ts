import { WorkspaceGraphqlSchemaSDLService } from 'src/engine/api/graphql/workspace-graphql-schema-sdl/workspace-graphql-schema-sdl.service';
import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { addFlatEntityToFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/add-flat-entity-to-flat-entity-maps-or-throw.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';

// createEmptyFlatEntityMaps() itself is untyped (`as const satisfies`); cast
// its known-empty shape to whatever entity type this test needs.
const emptyFlatEntityMaps = <T extends SyncableFlatEntity>() =>
  createEmptyFlatEntityMaps() as unknown as FlatEntityMaps<T>;

/* eslint-disable @typescript-eslint/no-explicit-any -- mocks: casting minimal
   fixtures/dependencies to the full generated entity/service types is not
   worth the ceremony here, see erp-object-permission-guard.service.spec.ts
   for the same pattern in this codebase */

const WORKSPACE = {
  id: 'workspace-1',
  databaseSchema: 'workspace_schema',
} as unknown as FlatWorkspace;

const TWENTY_STANDARD_APPLICATION_ID = 'twenty-standard-application-id';
const APP_A_ID = 'app-a-id'; // application the schema is scoped to
const APP_A_UNIVERSAL_IDENTIFIER = 'app-a-universal-identifier';
const APP_B_ID = 'app-b-id'; // declared dependency of APP_A
const APP_B_UNIVERSAL_IDENTIFIER = 'app-b-universal-identifier';
const APP_C_ID = 'app-c-id'; // unrelated, never declared
const APP_C_UNIVERSAL_IDENTIFIER = 'app-c-universal-identifier';

const buildFlatObjectMetadata = (applicationId: string): FlatObjectMetadata =>
  ({
    id: `object-${applicationId}`,
    universalIdentifier: `object-universal-${applicationId}`,
    applicationId,
    fieldIds: [],
  }) as unknown as FlatObjectMetadata;

const buildFlatApplicationMaps = ({
  applicationADependencies,
  applicationBDependencies = [],
}: {
  applicationADependencies: string[];
  applicationBDependencies?: string[];
}): FlatApplicationCacheMaps => ({
  byId: {
    [TWENTY_STANDARD_APPLICATION_ID]: {
      id: TWENTY_STANDARD_APPLICATION_ID,
      universalIdentifier: TWENTY_STANDARD_APPLICATION.universalIdentifier,
      dependencies: [],
    },
    [APP_A_ID]: {
      id: APP_A_ID,
      universalIdentifier: APP_A_UNIVERSAL_IDENTIFIER,
      dependencies: applicationADependencies,
    },
    [APP_B_ID]: {
      id: APP_B_ID,
      universalIdentifier: APP_B_UNIVERSAL_IDENTIFIER,
      dependencies: applicationBDependencies,
    },
    [APP_C_ID]: {
      id: APP_C_ID,
      universalIdentifier: APP_C_UNIVERSAL_IDENTIFIER,
      dependencies: [],
    },
  } as any,
  idByUniversalIdentifier: {
    [TWENTY_STANDARD_APPLICATION.universalIdentifier]:
      TWENTY_STANDARD_APPLICATION_ID,
    [APP_A_UNIVERSAL_IDENTIFIER]: APP_A_ID,
    [APP_B_UNIVERSAL_IDENTIFIER]: APP_B_ID,
    [APP_C_UNIVERSAL_IDENTIFIER]: APP_C_ID,
  },
});

const buildFlatObjectMetadataMaps = () => {
  let flatObjectMetadataMaps = emptyFlatEntityMaps<FlatObjectMetadata>();

  for (const applicationId of [
    TWENTY_STANDARD_APPLICATION_ID,
    APP_A_ID,
    APP_B_ID,
    APP_C_ID,
  ]) {
    flatObjectMetadataMaps = addFlatEntityToFlatEntityMapsOrThrow({
      flatEntity: buildFlatObjectMetadata(applicationId),
      flatEntityMaps: flatObjectMetadataMaps,
    });
  }

  return flatObjectMetadataMaps;
};

const buildService = ({
  applicationADependencies,
  applicationBDependencies,
}: {
  applicationADependencies: string[];
  applicationBDependencies?: string[];
}) => {
  const flatApplicationMaps = buildFlatApplicationMaps({
    applicationADependencies,
    applicationBDependencies,
  });
  const flatObjectMetadataMaps = buildFlatObjectMetadataMaps();
  const flatFieldMetadataMaps = emptyFlatEntityMaps<FlatFieldMetadata>();

  const workspaceManyOrAllFlatEntityMapsCacheService = {
    getOrRecomputeManyOrAllFlatEntityMapsWithHashes: jest
      .fn()
      .mockResolvedValue({
        data: {
          flatObjectMetadataMaps,
          flatFieldMetadataMaps,
          flatIndexMaps: createEmptyFlatEntityMaps(),
          flatApplicationMaps,
        },
        hashes: {
          flatObjectMetadataMaps: 'hash-objects',
          flatFieldMetadataMaps: 'hash-fields',
          flatIndexMaps: 'hash-indexes',
          flatApplicationMaps: 'hash-applications',
        },
      }),
  } as any;

  // Cache hit on the SDL/scalar names short-circuits schema (re)generation,
  // so the schema generator and scalar explorer never need to run — only
  // the flat entity map filtering (which happens before that cache lookup)
  // is under test here.
  const workspaceCacheStorageService = {
    getGraphQLTypeDefs: jest
      .fn()
      .mockResolvedValue('type Query { _: Boolean }'),
    getGraphQLUsedScalarNames: jest.fn().mockResolvedValue([]),
    setGraphQLTypeDefs: jest.fn(),
    setGraphQLUsedScalarNames: jest.fn(),
  } as any;

  return new WorkspaceGraphqlSchemaSDLService(
    {} as any,
    {} as any,
    workspaceCacheStorageService,
    workspaceManyOrAllFlatEntityMapsCacheService,
  );
};

const getVisibleApplicationIds = async (
  service: WorkspaceGraphqlSchemaSDLService,
) => {
  const result = await service.getOrComputeSchemaSDL(WORKSPACE, APP_A_ID);

  return Object.values(
    result?.flatObjectMetadataMaps.byUniversalIdentifier ?? {},
  )
    .filter((object): object is FlatObjectMetadata => object !== undefined)
    .map((object) => object.applicationId);
};

describe('WorkspaceGraphqlSchemaSDLService', () => {
  it('scopes the schema to the application and twenty-standard when it has no dependencies', async () => {
    const service = buildService({ applicationADependencies: [] });

    const visibleApplicationIds = await getVisibleApplicationIds(service);

    expect(visibleApplicationIds).toEqual(
      expect.arrayContaining([TWENTY_STANDARD_APPLICATION_ID, APP_A_ID]),
    );
    expect(visibleApplicationIds).not.toEqual(
      expect.arrayContaining([APP_B_ID, APP_C_ID]),
    );
  });

  it('includes objects of a declared dependency application, but not an undeclared one', async () => {
    const service = buildService({
      applicationADependencies: [APP_B_UNIVERSAL_IDENTIFIER],
    });

    const visibleApplicationIds = await getVisibleApplicationIds(service);

    expect(visibleApplicationIds).toEqual(
      expect.arrayContaining([
        TWENTY_STANDARD_APPLICATION_ID,
        APP_A_ID,
        APP_B_ID,
      ]),
    );
    expect(visibleApplicationIds).not.toEqual(
      expect.arrayContaining([APP_C_ID]),
    );
  });

  it('only resolves direct dependencies, not dependencies of a dependency', async () => {
    // APP_B declares APP_C as its own dependency; APP_A only declares APP_B.
    // APP_C must stay invisible to APP_A's schema — transitive resolution is
    // out of scope, matching resolveInstalledDependencyApplicationIds.
    const service = buildService({
      applicationADependencies: [APP_B_UNIVERSAL_IDENTIFIER],
      applicationBDependencies: [APP_C_UNIVERSAL_IDENTIFIER],
    });

    const visibleApplicationIds = await getVisibleApplicationIds(service);

    expect(visibleApplicationIds).toEqual(
      expect.arrayContaining([
        TWENTY_STANDARD_APPLICATION_ID,
        APP_A_ID,
        APP_B_ID,
      ]),
    );
    expect(visibleApplicationIds).not.toEqual(
      expect.arrayContaining([APP_C_ID]),
    );
  });
});
