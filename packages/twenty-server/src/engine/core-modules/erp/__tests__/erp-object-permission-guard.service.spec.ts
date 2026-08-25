import { ForbiddenException } from '@nestjs/common';

import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ROLE_ID = 'role-1';
const OBJECT_METADATA_ID = 'object-sales-invoice';
const OBJECT_NAME_SINGULAR = 'salesInvoice';

const buildFlatEntityMapsCacheService = () =>
  ({
    getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
      flatObjectMetadataMaps: {
        byUniversalIdentifier: {
          'universal-1': {
            id: OBJECT_METADATA_ID,
            nameSingular: OBJECT_NAME_SINGULAR,
          },
        },
      },
    }),
  }) as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

const buildWorkspaceCacheService = (
  rolesPermissions: Record<string, Record<string, unknown>>,
) =>
  ({
    getOrRecompute: jest.fn().mockResolvedValue({ rolesPermissions }),
  }) as unknown as WorkspaceCacheService;

describe('ErpObjectPermissionGuardService', () => {
  it('resolves when the role can update the object records', async () => {
    const service = new ErpObjectPermissionGuardService(
      buildWorkspaceCacheService({
        [ROLE_ID]: { [OBJECT_METADATA_ID]: { canUpdateObjectRecords: true } },
      }),
      buildFlatEntityMapsCacheService(),
    );

    await expect(
      service.assertCanUpdateObjectRecords({
        workspaceId: WORKSPACE_ID,
        roleId: ROLE_ID,
        objectNameSingular: OBJECT_NAME_SINGULAR,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects when the role lacks canUpdateObjectRecords on the object', async () => {
    const service = new ErpObjectPermissionGuardService(
      buildWorkspaceCacheService({
        [ROLE_ID]: { [OBJECT_METADATA_ID]: { canUpdateObjectRecords: false } },
      }),
      buildFlatEntityMapsCacheService(),
    );

    await expect(
      service.assertCanUpdateObjectRecords({
        workspaceId: WORKSPACE_ID,
        roleId: ROLE_ID,
        objectNameSingular: OBJECT_NAME_SINGULAR,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects when the role has no permissions entry at all', async () => {
    const service = new ErpObjectPermissionGuardService(
      buildWorkspaceCacheService({}),
      buildFlatEntityMapsCacheService(),
    );

    await expect(
      service.assertCanUpdateObjectRecords({
        workspaceId: WORKSPACE_ID,
        roleId: ROLE_ID,
        objectNameSingular: OBJECT_NAME_SINGULAR,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown document object before checking permissions', async () => {
    const workspaceCacheService = buildWorkspaceCacheService({
      [ROLE_ID]: { [OBJECT_METADATA_ID]: { canUpdateObjectRecords: true } },
    });
    const service = new ErpObjectPermissionGuardService(
      workspaceCacheService,
      buildFlatEntityMapsCacheService(),
    );

    await expect(
      service.assertCanUpdateObjectRecords({
        workspaceId: WORKSPACE_ID,
        roleId: ROLE_ID,
        objectNameSingular: 'unknownObject',
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(workspaceCacheService.getOrRecompute).not.toHaveBeenCalled();
  });
});
