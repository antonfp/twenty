import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { isDefined } from 'twenty-shared/utils';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// CoreResolver puts the mutations into the /graphql core schema scope:
// unscoped resolvers default to the metadata scope and would land nowhere.
@CoreResolver()
@UseGuards(WorkspaceAuthGuard)
export class ErpPostingResolver {
  constructor(
    private readonly postingService: PostingService,
    private readonly permissionsService: PermissionsService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  @Mutation(() => Boolean)
  async postDocument(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Args('objectNameSingular') objectNameSingular: string,
    @Args('recordId', { type: () => UUIDScalarType }) recordId: string,
  ): Promise<boolean> {
    await this.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
      objectNameSingular,
    });
    await this.postingService.post(workspace.id, objectNameSingular, recordId);

    return true;
  }

  @Mutation(() => Boolean)
  async cancelDocument(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Args('objectNameSingular') objectNameSingular: string,
    @Args('recordId', { type: () => UUIDScalarType }) recordId: string,
  ): Promise<boolean> {
    await this.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
      objectNameSingular,
    });
    await this.postingService.cancel(
      workspace.id,
      objectNameSingular,
      recordId,
    );

    return true;
  }

  // Posting writes the document and its registers, so it requires the same
  // permission as updating the document's records directly.
  private async assertCanUpdateObjectRecords({
    workspaceId,
    userWorkspaceId,
    apiKey,
    objectNameSingular,
  }: {
    workspaceId: string;
    userWorkspaceId: string | undefined;
    apiKey: FlatApiKey | undefined;
    objectNameSingular: string;
  }): Promise<void> {
    const { flatObjectMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps'],
        },
      );

    const objectMetadata = Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    ).find(
      (flatObject) =>
        isDefined(flatObject) &&
        flatObject.nameSingular === objectNameSingular,
    );

    if (!isDefined(objectMetadata)) {
      throw new ForbiddenException(
        `Unknown document object "${objectNameSingular}"`,
      );
    }

    const objectsPermissions = await this.resolveObjectsPermissions({
      workspaceId,
      userWorkspaceId,
      apiKey,
    });

    if (objectsPermissions[objectMetadata.id]?.canUpdateObjectRecords !== true) {
      throw new ForbiddenException(
        `Недостаточно прав: проведение документов «${objectNameSingular}» требует права на изменение записей этого объекта.`,
      );
    }
  }

  private async resolveObjectsPermissions({
    workspaceId,
    userWorkspaceId,
    apiKey,
  }: {
    workspaceId: string;
    userWorkspaceId: string | undefined;
    apiKey: FlatApiKey | undefined;
  }): Promise<Record<string, { canUpdateObjectRecords?: boolean | null }>> {
    if (isDefined(userWorkspaceId)) {
      const { objectsPermissions } =
        await this.permissionsService.getUserWorkspacePermissions({
          userWorkspaceId,
          workspaceId,
        });

      return objectsPermissions;
    }

    if (isDefined(apiKey)) {
      const roleId = await this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
      const { rolesPermissions } = await this.workspaceCacheService.getOrRecompute(
        workspaceId,
        ['rolesPermissions'],
      );

      return rolesPermissions[roleId] ?? {};
    }

    throw new ForbiddenException(
      'Проведение документов требует аутентифицированного пользователя или API-ключа.',
    );
  }
}
