import { UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { CreateInvoiceRevisionService } from 'src/engine/core-modules/erp-sales/services/create-invoice-revision.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';

// «Создать исправление» (Task 6): один UI/MCP entrypoint, exposed here as a
// GraphQL mutation for the front-end command — mirrors ErpPostingResolver's
// postDocument/cancelDocument shape (auth guard, role resolution via the
// shared ErpActorRoleResolverService, same ErpObjectPermissionGuardService
// check), but specific to salesInvoice because the copy logic itself is
// sales-invoice-shaped, unlike posting which is object-agnostic.
// CustomPermissionGuard only documents that permission checks live here (same
// convention as SalesInvoicePrintController) — the object-update check below
// is the actual enforcement.
@CoreResolver()
@UseGuards(WorkspaceAuthGuard, CustomPermissionGuard)
export class SalesInvoiceRevisionResolver {
  constructor(
    private readonly createInvoiceRevisionService: CreateInvoiceRevisionService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Mutation(() => UUIDScalarType)
  async createInvoiceRevision(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Args('recordId', { type: () => UUIDScalarType }) recordId: string,
  ): Promise<string> {
    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    // Creating a revision writes a new salesInvoice record — same permission
    // as updating that object's records directly (matches post/cancelDocument).
    await this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: SALES_INVOICE_OBJECT_NAME,
    });

    const result =
      await this.createInvoiceRevisionService.createInvoiceRevision(
        workspace.id,
        recordId,
      );

    return result.id;
  }
}
