import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

// Inert until ErpModule is imported into CoreEngineModule (see WIRING.md):
// code-first discovery only picks resolvers out of registered modules.
@Resolver()
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
