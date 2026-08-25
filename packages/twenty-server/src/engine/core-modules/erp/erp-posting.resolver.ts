import { UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

// CoreResolver puts the mutations into the /graphql core schema scope:
// unscoped resolvers default to the metadata scope and would land nowhere.
@CoreResolver()
@UseGuards(WorkspaceAuthGuard)
export class ErpPostingResolver {
  constructor(private readonly postingService: PostingService) {}

  @Mutation(() => Boolean)
  async postDocument(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('objectNameSingular') objectNameSingular: string,
    @Args('recordId', { type: () => UUIDScalarType }) recordId: string,
  ): Promise<boolean> {
    await this.postingService.post(workspace.id, objectNameSingular, recordId);

    return true;
  }

  @Mutation(() => Boolean)
  async cancelDocument(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('objectNameSingular') objectNameSingular: string,
    @Args('recordId', { type: () => UUIDScalarType }) recordId: string,
  ): Promise<boolean> {
    await this.postingService.cancel(
      workspace.id,
      objectNameSingular,
      recordId,
    );

    return true;
  }
}
