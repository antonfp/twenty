import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';
import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';

const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';

// Registered before RestApiModule's `rest/*path` catch-all (CoreEngineModule
// is imported earlier in AppModule), same mechanism as ApiKeyController.
// CustomPermissionGuard only documents that permission checks live here —
// the object-read check below is the actual enforcement.
@Controller(`${ApiPath.Rest}/erp/sales-invoices`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class SalesInvoicePrintController {
  constructor(
    private readonly salesInvoicePrintService: SalesInvoicePrintService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Get(':salesInvoiceId/print')
  async printSalesInvoice(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Param('salesInvoiceId', ParseUUIDPipe) salesInvoiceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    await this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: SALES_INVOICE_OBJECT_NAME,
    });

    const html = await this.salesInvoicePrintService.renderSalesInvoiceHtml(
      workspace.id,
      salesInvoiceId,
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }
}
