import {
  BadRequestException,
  Controller,
  Post,
  Query,
  type RawBodyRequest,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { type Request } from 'express';
import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import {
  BankStatementImportService,
  type BankStatementImportReport,
} from 'src/engine/core-modules/erp-accounting/services/bank-statement-import.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Registered before RestApiModule's `rest/*path` catch-all (CoreEngineModule
// is imported earlier in AppModule), same mechanism as the print/trial-balance
// controllers. CustomPermissionGuard only documents that permission checks
// live here — the object-update checks below are the actual enforcement.
// Body is read from request.rawBody (Nest's global `rawBody: true`, see
// main.ts) rather than the parsed request.body, so the exact CP1251 bytes
// reach the parser untouched by body-parser's UTF-8 string decoding.
@Controller(`${ApiPath.Rest}/erp/bank-statements`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class BankStatementImportController {
  constructor(
    private readonly bankStatementImportService: BankStatementImportService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  // Ruling allowed multipart OR text body; raw text/octet-stream was chosen:
  // it keeps CP1251 bytes intact end to end with no multipart-decoder step,
  // and MVP's only consumers (the import_bank_statement MCP tool and
  // scripts) send a file body directly. Add multipart alongside the future
  // front-end upload UI, whose <input type="file"> submits that way.
  @Post('import')
  async importBankStatement(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<BankStatementImportReport> {
    if (
      !isNonEmptyString(organizationId) ||
      !UUID_PATTERN.test(organizationId)
    ) {
      throw new BadRequestException(
        'Параметр organizationId обязателен и должен быть корректным UUID',
      );
    }

    const buffer = request.rawBody;

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new BadRequestException(
        'Тело запроса должно содержать текст выписки (Content-Type: text/plain или application/octet-stream)',
      );
    }

    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    // Importing creates payment/supplierPayment records depending on each
    // row's direction, so it needs the same permission as updating those
    // objects directly (ErpObjectPermissionGuardService's create-via-update
    // convention — see post-document.tool.ts).
    await this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: 'payment',
    });
    await this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: 'supplierPayment',
    });

    return this.bankStatementImportService.importStatement(
      workspace.id,
      organizationId,
      buffer,
    );
  }
}
