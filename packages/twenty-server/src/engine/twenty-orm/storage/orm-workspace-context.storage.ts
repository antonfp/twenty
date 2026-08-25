import { AsyncLocalStorage } from 'async_hooks';

import {
  type ObjectsPermissionsByRoleId,
  type FeatureFlagKey,
} from 'twenty-shared/types';
import { type EntityMetadata } from 'typeorm';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type UserWorkspaceRoleMap } from 'src/engine/metadata-modules/role-target/types/user-workspace-role-map';

export type ORMWorkspaceContext = {
  authContext: WorkspaceAuthContext;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  flatIndexMaps: FlatEntityMaps<FlatIndexMetadata>;
  objectIdByNameSingular: Record<string, string>;
  featureFlagsMap: Record<FeatureFlagKey, boolean>;
  permissionsPerRoleId: ObjectsPermissionsByRoleId;
  entityMetadatas: EntityMetadata[];
  userWorkspaceRoleMap: UserWorkspaceRoleMap;
  apiKeyRoleMap: Record<string, string>;
};

export const workspaceContextStorage =
  new AsyncLocalStorage<ORMWorkspaceContext>();

export const getWorkspaceContext = (): ORMWorkspaceContext => {
  const context = workspaceContextStorage.getStore();

  if (!context) {
    throw new Error(
      'Workspace context not set. Operations must be wrapped with withWorkspaceContext()',
    );
  }

  return context;
};

export const withWorkspaceContext = <T>(
  context: ORMWorkspaceContext,
  fn: () => T | Promise<T>,
): T | Promise<T> => {
  return workspaceContextStorage.run(context, fn);
};

export const setWorkspaceContext = (context: ORMWorkspaceContext): void => {
  workspaceContextStorage.enterWith(context);
};
