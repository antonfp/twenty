import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
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
import {
  SalesShipmentPrintService,
  type UpdStatus,
} from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

const SALES_SHIPMENT_OBJECT_NAME = 'salesShipment';

// Registered before RestApiModule's `rest/*path` catch-all (CoreEngineModule
// is imported earlier in AppModule), same mechanism as ApiKeyController.
// CustomPermissionGuard only documents that permission checks live here —
// the object-read check below is the actual enforcement.
@Controller(`${ApiPath.Rest}/erp/sales-shipments`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class SalesShipmentPrintController {
  constructor(
    private readonly salesShipmentPrintService: SalesShipmentPrintService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Get(':salesShipmentId/print-upd')
  async printSalesShipmentUpd(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Param('salesShipmentId', ParseUUIDPipe) salesShipmentId: string,
    @Query('status') status: string | undefined,
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
      objectNameSingular: SALES_SHIPMENT_OBJECT_NAME,
    });

    // Default «2»: MVP без выделенного счёт-фактурного контура — УПД как
    // передаточный документ; статус «1» (СЧФ + первичка) включается явно.
    const updStatus: UpdStatus =
      status === undefined ? '2' : (status as UpdStatus);

    if (updStatus !== '1' && updStatus !== '2') {
      throw new BadRequestException('УПД status must be "1" or "2"');
    }

    const html =
      await this.salesShipmentPrintService.renderSalesShipmentUpdHtml(
        workspace.id,
        salesShipmentId,
        updStatus,
      );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }
}
