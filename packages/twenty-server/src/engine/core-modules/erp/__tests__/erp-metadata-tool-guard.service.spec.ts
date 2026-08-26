import { ForbiddenException } from '@nestjs/common';

import { ErpMetadataToolGuardService } from 'src/engine/core-modules/erp/services/erp-metadata-tool-guard.service';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ROLE_ID = 'role-1';

const SALES_INVOICE_OBJECT_ID = 'object-sales-invoice';
const GL_ENTRY_OBJECT_ID = 'object-gl-entry';

// The guard receives only a resolved roleId — it never sees whether that
// role came from a user or an API key (that branch lives upstream in
// McpProtocolService.getRoleId / ErpActorRoleResolverService, already
// covered elsewhere). It is intentionally actor-agnostic: PermissionsService.
// checkRolesPermissions({unionOf:[roleId]}, ...) behaves identically no
// matter which auth path produced roleId, so "covers user and api-key
// actors" is proven by roleId being the ONLY input the admin check reads —
// these tests exercise it with arbitrary role ids to demonstrate that.
const USER_DERIVED_ROLE_ID = 'user-role-1';
const API_KEY_DERIVED_ROLE_ID = 'api-key-role-1';

const buildFlatEntityMapsCacheService = () =>
  ({
    getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
      flatObjectMetadataMaps: {
        universalIdentifierById: {
          [SALES_INVOICE_OBJECT_ID]: 'universal-sales-invoice',
          [GL_ENTRY_OBJECT_ID]: 'universal-gl-entry',
        },
        byUniversalIdentifier: {
          'universal-sales-invoice': {
            id: SALES_INVOICE_OBJECT_ID,
            nameSingular: 'salesInvoice',
          },
          'universal-gl-entry': {
            id: GL_ENTRY_OBJECT_ID,
            nameSingular: 'glEntry',
          },
        },
      },
    }),
  }) as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

const buildPermissionsService = (hasDataModelPermission: boolean) =>
  ({
    checkRolesPermissions: jest.fn().mockResolvedValue(hasDataModelPermission),
  }) as unknown as PermissionsService;

const buildService = ({
  hasDataModelPermission = true,
}: { hasDataModelPermission?: boolean } = {}) => {
  const permissionsService = buildPermissionsService(hasDataModelPermission);
  const flatEntityMapsCacheService = buildFlatEntityMapsCacheService();

  return {
    service: new ErpMetadataToolGuardService(
      permissionsService,
      flatEntityMapsCacheService,
    ),
    permissionsService,
    flatEntityMapsCacheService,
  };
};

describe('ErpMetadataToolGuardService', () => {
  describe('register frontier', () => {
    it('rejects create_field_metadata targeting a register object', async () => {
      const { service } = buildService();

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_field_metadata',
          args: { objectMetadataId: GL_ENTRY_OBJECT_ID },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects create_many_field_metadata when ANY item targets a register', async () => {
      const { service } = buildService();

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_many_field_metadata',
          args: {
            fields: [
              { objectMetadataId: SALES_INVOICE_OBJECT_ID },
              { objectMetadataId: GL_ENTRY_OBJECT_ID },
            ],
          },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects create_many_relation_fields when the TARGET object is a register', async () => {
      const { service } = buildService();

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_many_relation_fields',
          args: {
            relations: [
              {
                objectMetadataId: SALES_INVOICE_OBJECT_ID,
                targetObjectMetadataId: GL_ENTRY_OBJECT_ID,
              },
            ],
          },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects create_view targeting a register object by name', async () => {
      const { service, flatEntityMapsCacheService } = buildService();

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_view',
          args: { objectNameSingular: 'glEntry', name: 'Все проводки' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
      // Register check is name-based for views — no need to resolve maps.
      expect(
        flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps,
      ).not.toHaveBeenCalled();
    });

    it('rejects upsert_complete_view in create mode (no id) targeting a register', async () => {
      const { service } = buildService();

      await expect(
        service.assertToolCallAllowed({
          toolName: 'upsert_complete_view',
          args: { objectNameSingular: 'itemBalance' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects even when the caller has DATA_MODEL — register check is unconditional', async () => {
      const { service } = buildService({ hasDataModelPermission: true });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_field_metadata',
          args: { objectMetadataId: GL_ENTRY_OBJECT_ID },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('MVP: creation-only frontier (update/delete refused unconditionally)', () => {
    it.each([
      'update_object_metadata',
      'update_many_object_metadata',
      'delete_object_metadata',
      'update_field_metadata',
      'update_many_field_metadata',
      'delete_field_metadata',
    ])('rejects %s regardless of permission or target', async (toolName) => {
      const { service, permissionsService } = buildService({
        hasDataModelPermission: true,
      });

      await expect(
        service.assertToolCallAllowed({
          toolName,
          args: { id: SALES_INVOICE_OBJECT_ID },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
      // Unconditional refusal — no need to spend a permission-cache round trip.
      expect(permissionsService.checkRolesPermissions).not.toHaveBeenCalled();
    });

    it('leaves update_view/delete_view/get_views untouched (out of frontier scope)', async () => {
      const { service, permissionsService } = buildService({
        hasDataModelPermission: false,
      });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'update_view',
          args: { id: 'view-1', name: 'Renamed' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
      // upsert_complete_view WITH an id is update mode, also untouched.
      await expect(
        service.assertToolCallAllowed({
          toolName: 'upsert_complete_view',
          args: { id: 'view-1' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
      expect(permissionsService.checkRolesPermissions).not.toHaveBeenCalled();
    });
  });

  describe('admin-only permission (DATA_MODEL)', () => {
    it('rejects create_object_metadata for a role without DATA_MODEL (user-derived roleId)', async () => {
      const { service } = buildService({ hasDataModelPermission: false });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_object_metadata',
          args: { nameSingular: 'contract', namePlural: 'contracts' },
          workspaceId: WORKSPACE_ID,
          roleId: USER_DERIVED_ROLE_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
      // T2 review Finding 2: assert the RU wording too, not just the
      // exception type — this is the message the agent actually sees.
      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_object_metadata',
          args: { nameSingular: 'contract', namePlural: 'contracts' },
          workspaceId: WORKSPACE_ID,
          roleId: USER_DERIVED_ROLE_ID,
        }),
      ).rejects.toThrow(/DATA_MODEL/);
    });

    it('rejects create_object_metadata for a role without DATA_MODEL (api-key-derived roleId)', async () => {
      const { service } = buildService({ hasDataModelPermission: false });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_object_metadata',
          args: { nameSingular: 'contract', namePlural: 'contracts' },
          workspaceId: WORKSPACE_ID,
          roleId: API_KEY_DERIVED_ROLE_ID,
        }),
      ).rejects.toThrow(/DATA_MODEL/);
    });

    it('allows create_object_metadata once DATA_MODEL is granted, regardless of which actor resolved the role', async () => {
      const { service, permissionsService } = buildService({
        hasDataModelPermission: true,
      });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_object_metadata',
          args: { nameSingular: 'contract', namePlural: 'contracts' },
          workspaceId: WORKSPACE_ID,
          roleId: API_KEY_DERIVED_ROLE_ID,
        }),
      ).resolves.toBeUndefined();
      expect(permissionsService.checkRolesPermissions).toHaveBeenCalledWith(
        { unionOf: [API_KEY_DERIVED_ROLE_ID] },
        WORKSPACE_ID,
        'DATA_MODEL',
      );
    });

    it('does not gate read tools at all (no permission check)', async () => {
      const { service, permissionsService } = buildService({
        hasDataModelPermission: false,
      });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'get_object_metadata',
          args: {},
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
      expect(permissionsService.checkRolesPermissions).not.toHaveBeenCalled();
    });
  });

  describe('happy path: creation on non-register objects', () => {
    it('allows create_object_metadata for a new object', async () => {
      const { service } = buildService({ hasDataModelPermission: true });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_object_metadata',
          args: { nameSingular: 'contract', namePlural: 'contracts' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
    });

    it('allows create_field_metadata adding a custom field to an app-owned object', async () => {
      const { service } = buildService({ hasDataModelPermission: true });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_field_metadata',
          args: { objectMetadataId: SALES_INVOICE_OBJECT_ID, name: 'discount' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
    });

    it('allows create_view for a non-register object', async () => {
      const { service } = buildService({ hasDataModelPermission: true });

      await expect(
        service.assertToolCallAllowed({
          toolName: 'create_view',
          args: { objectNameSingular: 'salesInvoice', name: 'Мои счета' },
          workspaceId: WORKSPACE_ID,
          roleId: ROLE_ID,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
