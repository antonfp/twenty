import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { isDefined } from 'twenty-shared/utils';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

// CoreResolver puts the mutations into the /graphql core schema scope:
// unscoped resolvers default to the metadata scope and would land nowhere.
@CoreResolver()
@UseGuards(WorkspaceAuthGuard)
export class ErpPostingResolver {
  constructor(
    private readonly postingService: PostingService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly userRoleService: UserRoleService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
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
  // permission as updating the document's records directly. The actual
  // metadata-lookup + rolesPermissions check lives in
  // ErpObjectPermissionGuardService, shared with the MCP post/cancel_document
  // tools so the rule isn't duplicated per caller.
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
    const roleId = await this.resolveRoleId({
      workspaceId,
      userWorkspaceId,
      apiKey,
    });

    await this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
      workspaceId,
      roleId,
      objectNameSingular,
    });
  }

  private async resolveRoleId({
    workspaceId,
    userWorkspaceId,
    apiKey,
  }: {
    workspaceId: string;
    userWorkspaceId: string | undefined;
    apiKey: FlatApiKey | undefined;
  }): Promise<string> {
    if (isDefined(userWorkspaceId)) {
      return this.userRoleService.getRoleIdForUserWorkspace({
        workspaceId,
        userWorkspaceId,
      });
    }

    if (isDefined(apiKey)) {
      return this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
    }

    throw new ForbiddenException(
      'Проведение документов требует аутентифицированного пользователя или API-ключа.',
    );
  }
}
