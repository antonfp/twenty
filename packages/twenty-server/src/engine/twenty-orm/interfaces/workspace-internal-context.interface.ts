import { type DataSource } from 'typeorm';
import { type FeatureFlagKey } from 'twenty-shared/types';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatIndexMetadata } from 'src/engine/metadata-modules/flat-index-metadata/types/flat-index-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type UserWorkspaceRoleMap } from 'src/engine/metadata-modules/role-target/types/user-workspace-role-map';
import { type WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';

export interface WorkspaceInternalContext {
  workspaceId: string;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  flatIndexMaps: FlatEntityMaps<FlatIndexMetadata>;
  objectIdByNameSingular: Record<string, string>;
  featureFlagsMap: Record<FeatureFlagKey, boolean>;
  userWorkspaceRoleMap: UserWorkspaceRoleMap;
  apiKeyRoleMap: Record<string, string>;
  eventEmitterService: WorkspaceEventEmitter;
  coreDataSource: DataSource;
}
