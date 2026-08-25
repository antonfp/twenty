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
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';

// Registered before RestApiModule's `rest/*path` catch-all (CoreEngineModule
// is imported earlier in AppModule), same mechanism as ApiKeyController.
@Controller(`${ApiPath.Rest}/erp/sales-invoices`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class SalesInvoicePrintController {
  constructor(
    private readonly salesInvoicePrintService: SalesInvoicePrintService,
  ) {}

  @Get(':salesInvoiceId/print')
  async printSalesInvoice(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Param('salesInvoiceId', ParseUUIDPipe) salesInvoiceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const html = await this.salesInvoicePrintService.renderSalesInvoiceHtml(
      workspace.id,
      salesInvoiceId,
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }
}
