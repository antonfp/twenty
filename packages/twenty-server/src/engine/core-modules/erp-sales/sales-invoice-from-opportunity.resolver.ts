import { UseGuards } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { CreateInvoiceFromOpportunityService } from 'src/engine/core-modules/erp-sales/services/create-invoice-from-opportunity.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const OPPORTUNITY_OBJECT_NAME = 'opportunity';

// «Создать счёт» (Task 8, glue Сделка→Счёт): mirrors
// SalesInvoiceRevisionResolver — same auth guard, same role resolution via
// ErpActorRoleResolverService, same ErpObjectPermissionGuardService check.
@CoreResolver()
@UseGuards(WorkspaceAuthGuard, CustomPermissionGuard)
export class SalesInvoiceFromOpportunityResolver {
  constructor(
    private readonly createInvoiceFromOpportunityService: CreateInvoiceFromOpportunityService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Mutation(() => UUIDScalarType)
  async createInvoiceFromOpportunity(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Args('opportunityId', { type: () => UUIDScalarType })
    opportunityId: string,
  ): Promise<string> {
    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    // Creating an invoice writes a new salesInvoice record — same permission
    // as updating that object's records directly (matches
    // createInvoiceRevision/post/cancelDocument).
    await this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: SALES_INVOICE_OBJECT_NAME,
    });
    // The service reads and COPIES the deal's name/amount/company into the
    // new invoice via a bypass-permissions repository — without this check
    // an actor who can write salesInvoice but can't read opportunity would
    // exfiltrate CRM data through the invoice it creates (review Major #1).
    // Same dual-check shape as reconcile_payments/confirm_reconciliation.
    await this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: OPPORTUNITY_OBJECT_NAME,
    });

    const result =
      await this.createInvoiceFromOpportunityService.createInvoiceFromOpportunity(
        workspace.id,
        opportunityId,
      );

    return result.id;
  }
}
