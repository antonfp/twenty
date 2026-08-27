import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { Response } from 'express';
import { ApiPath } from 'twenty-shared/types';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

// Read permission gate: КУДиР doesn't read glEntry at all (unlike ОСВ/
// баланс/карточка счёта) — it reads payment/supplierPayment/salesInvoice/
// supplierInvoice/goodsReceipt/salesShipment directly. `payment` is the one
// register every organization on a supported СНО actually reads (income is
// universal; the expense sources are conditional on СНО), so it's the
// representative gate — same "read permission on the register this report
// reads" reasoning as account-card.controller.ts.
const PAYMENT_OBJECT_NAME = 'payment';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const YEAR_PATTERN = /^\d{4}$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// Same registration mechanism as the other erp/reports controllers
// (registered before RestApiModule's `rest/*path` catch-all).
@Controller(`${ApiPath.Rest}/erp/reports`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class KudirController {
  constructor(
    private readonly kudirService: KudirService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Get('kudir')
  async getKudir(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Query('year') yearParam: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    this.validateOrganizationId(organizationId);
    const year = this.validateYear(yearParam);

    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    await this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: PAYMENT_OBJECT_NAME,
    });

    // kudir.service.ts throws BadRequestException (не-УСН организация) /
    // NotFoundException (организация не найдена) — RestApiExceptionFilter
    // turns those into the 400/404 RU response the ruling asks for.
    const html = await this.kudirService.renderHtml(
      workspace.id,
      organizationId as string,
      year,
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }

  private validateOrganizationId(organizationId: string | undefined): void {
    if (
      !isNonEmptyString(organizationId) ||
      !UUID_PATTERN.test(organizationId)
    ) {
      throw new BadRequestException(
        'Параметр organizationId обязателен и должен быть корректным UUID',
      );
    }
  }

  private validateYear(yearParam: string | undefined): number {
    if (!isNonEmptyString(yearParam) || !YEAR_PATTERN.test(yearParam)) {
      throw new BadRequestException(
        'Параметр year обязателен и должен быть четырёхзначным годом (ГГГГ)',
      );
    }

    const year = Number(yearParam);

    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new BadRequestException(
        `Параметр year должен быть в диапазоне ${MIN_YEAR}–${MAX_YEAR}`,
      );
    }

    return year;
  }
}
