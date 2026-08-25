import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatWebhook } from 'src/engine/metadata-modules/flat-webhook/types/flat-webhook.type';
import { type MetadataSideEffectEngineService } from 'src/engine/metadata-modules/metadata-side-effect/services/metadata-side-effect-engine.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import {
  WorkspaceMigrationFlatEntityMapsService,
  type WorkspaceMigrationRelatedFlatEntityMaps,
} from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-flat-entity-maps.service';

const STANDARD_APPLICATION_ID = 'standard-application-id';
const OWN_APPLICATION_ID = 'own-application-id';
const OWN_APPLICATION_UNIVERSAL_IDENTIFIER =
  'aaaaaaaa-0000-4000-8000-000000000001';
const DEPENDENCY_APPLICATION_ID = 'dependency-application-id';
const DEPENDENCY_APPLICATION_UNIVERSAL_IDENTIFIER =
  'bbbbbbbb-0000-4000-8000-000000000002';
const UNRELATED_APPLICATION_ID = 'unrelated-application-id';
const UNRELATED_APPLICATION_UNIVERSAL_IDENTIFIER =
  'cccccccc-0000-4000-8000-000000000003';

const buildFlatApplication = ({
  id,
  universalIdentifier,
  dependencies,
}: {
  id: string;
  universalIdentifier: string;
  dependencies: string[] | null;
}): FlatApplication =>
  ({ id, universalIdentifier, dependencies }) as unknown as FlatApplication;

const buildFlatWebhook = ({
  universalIdentifier,
  applicationId,
}: {
  universalIdentifier: string;
  applicationId: string;
}): FlatWebhook =>
  ({
    id: universalIdentifier,
    universalIdentifier,
    applicationId,
  }) as unknown as FlatWebhook;

const buildFlatWebhookMaps = (
  flatWebhooks: FlatWebhook[],
): FlatEntityMaps<FlatWebhook> => {
  const flatWebhookMaps: FlatEntityMaps<FlatWebhook> = {
    byUniversalIdentifier: {},
    universalIdentifierById: {},
    universalIdentifiersByApplicationId: {},
  };

  for (const flatWebhook of flatWebhooks) {
    flatWebhookMaps.byUniversalIdentifier[flatWebhook.universalIdentifier] =
      flatWebhook;
    flatWebhookMaps.universalIdentifierById[flatWebhook.id] =
      flatWebhook.universalIdentifier;
    flatWebhookMaps.universalIdentifiersByApplicationId[
      flatWebhook.applicationId
    ] = [
      ...(flatWebhookMaps.universalIdentifiersByApplicationId[
        flatWebhook.applicationId
      ] ?? []),
      flatWebhook.universalIdentifier,
    ];
  }

  return flatWebhookMaps;
};

const buildService = () =>
  new WorkspaceMigrationFlatEntityMapsService(
    undefined as unknown as WorkspaceCacheService,
    undefined as unknown as MetadataSideEffectEngineService,
  );

const buildComputeArgs = ({
  ownApplicationDependencies,
}: {
  ownApplicationDependencies: string[] | null;
}) => {
  const flatApplicationMaps: FlatApplicationCacheMaps = {
    byId: {
      [STANDARD_APPLICATION_ID]: buildFlatApplication({
        id: STANDARD_APPLICATION_ID,
        universalIdentifier: TWENTY_STANDARD_APPLICATION.universalIdentifier,
        dependencies: null,
      }),
      [OWN_APPLICATION_ID]: buildFlatApplication({
        id: OWN_APPLICATION_ID,
        universalIdentifier: OWN_APPLICATION_UNIVERSAL_IDENTIFIER,
        dependencies: ownApplicationDependencies,
      }),
      [DEPENDENCY_APPLICATION_ID]: buildFlatApplication({
        id: DEPENDENCY_APPLICATION_ID,
        universalIdentifier: DEPENDENCY_APPLICATION_UNIVERSAL_IDENTIFIER,
        dependencies: null,
      }),
      [UNRELATED_APPLICATION_ID]: buildFlatApplication({
        id: UNRELATED_APPLICATION_ID,
        universalIdentifier: UNRELATED_APPLICATION_UNIVERSAL_IDENTIFIER,
        dependencies: null,
      }),
    },
    idByUniversalIdentifier: {
      [TWENTY_STANDARD_APPLICATION.universalIdentifier]:
        STANDARD_APPLICATION_ID,
      [OWN_APPLICATION_UNIVERSAL_IDENTIFIER]: OWN_APPLICATION_ID,
      [DEPENDENCY_APPLICATION_UNIVERSAL_IDENTIFIER]: DEPENDENCY_APPLICATION_ID,
      [UNRELATED_APPLICATION_UNIVERSAL_IDENTIFIER]: UNRELATED_APPLICATION_ID,
    },
  };

  const flatWebhookMaps = buildFlatWebhookMaps([
    buildFlatWebhook({
      universalIdentifier: 'webhook-own',
      applicationId: OWN_APPLICATION_ID,
    }),
    buildFlatWebhook({
      universalIdentifier: 'webhook-dependency',
      applicationId: DEPENDENCY_APPLICATION_ID,
    }),
    buildFlatWebhook({
      universalIdentifier: 'webhook-unrelated',
      applicationId: UNRELATED_APPLICATION_ID,
    }),
  ]);

  return {
    allFlatEntityOperationRecordByMetadataName: {
      webhook: {
        flatEntityToCreate: {},
        flatEntityToUpdate: {},
        flatEntityToDelete: {},
      },
    },
    applicationUniversalIdentifier: OWN_APPLICATION_UNIVERSAL_IDENTIFIER,
    flatApplicationMaps,
    allRelatedFlatEntityMaps: {
      flatWebhookMaps,
      featureFlagsMap:
        {} as WorkspaceMigrationRelatedFlatEntityMaps['featureFlagsMap'],
    },
    allMetadataNameCacheToCompute: ['webhook' as const],
  };
};

describe('WorkspaceMigrationFlatEntityMapsService', () => {
  describe('computeFromToAllFlatEntityMapsAndBuildOptions', () => {
    it('includes entities of applications declared as dependencies in the dependency maps', () => {
      const service = buildService();

      const { dependencyAllFlatEntityMaps } =
        service.computeFromToAllFlatEntityMapsAndBuildOptions(
          buildComputeArgs({
            ownApplicationDependencies: [
              DEPENDENCY_APPLICATION_UNIVERSAL_IDENTIFIER,
            ],
          }),
        );

      const dependencyWebhookUniversalIdentifiers = Object.keys(
        dependencyAllFlatEntityMaps.flatWebhookMaps?.byUniversalIdentifier ??
          {},
      );

      expect(dependencyWebhookUniversalIdentifiers).toContain('webhook-own');
      expect(dependencyWebhookUniversalIdentifiers).toContain(
        'webhook-dependency',
      );
      expect(dependencyWebhookUniversalIdentifiers).not.toContain(
        'webhook-unrelated',
      );
    });

    it('keeps undeclared applications invisible in the dependency maps', () => {
      const service = buildService();

      const { dependencyAllFlatEntityMaps } =
        service.computeFromToAllFlatEntityMapsAndBuildOptions(
          buildComputeArgs({ ownApplicationDependencies: null }),
        );

      const dependencyWebhookUniversalIdentifiers = Object.keys(
        dependencyAllFlatEntityMaps.flatWebhookMaps?.byUniversalIdentifier ??
          {},
      );

      expect(dependencyWebhookUniversalIdentifiers).toContain('webhook-own');
      expect(dependencyWebhookUniversalIdentifiers).not.toContain(
        'webhook-dependency',
      );
      expect(dependencyWebhookUniversalIdentifiers).not.toContain(
        'webhook-unrelated',
      );
    });
  });
});
