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
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthApiKey } from 'src/engine/decorators/auth/auth-api-key.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

const GL_ENTRY_OBJECT_NAME = 'glEntry';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Rejects a syntactically matching but impossible date (e.g. "2026-02-30");
// Date normalizes those forward, so the round-trip through UTC components
// is the only reliable check. Duplicated from trial-balance.controller.ts
// (same small self-contained helper, matching that file's own convention of
// not sharing this across controllers — see its header comment).
const isValidCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Registered before RestApiModule's `rest/*path` catch-all (CoreEngineModule
// is imported earlier in AppModule), same mechanism as trial-balance.controller.ts.
// CustomPermissionGuard only documents that permission checks live here — the
// object-read check below (on glEntry, the register both reports read) is
// the actual enforcement, same reasoning as the ОСВ endpoint.
@Controller(`${ApiPath.Rest}/erp/reports`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class FinancialStatementsController {
  constructor(
    private readonly balanceSheetService: BalanceSheetService,
    private readonly incomeStatementService: IncomeStatementService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Get('balance-sheet')
  async getBalanceSheet(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Query('date') date: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    this.validateOrganizationId(organizationId);
    this.validateDateParam('date', date);

    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    await this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: GL_ENTRY_OBJECT_NAME,
    });

    const html = await this.balanceSheetService.renderHtml(
      workspace.id,
      organizationId as string,
      date as string,
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }

  @Get('income-statement')
  async getIncomeStatement(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    this.validateOrganizationId(organizationId);
    this.validateDateParam('dateFrom', dateFrom);
    this.validateDateParam('dateTo', dateTo);

    if (
      isNonEmptyString(dateFrom) &&
      isNonEmptyString(dateTo) &&
      dateFrom > dateTo
    ) {
      throw new BadRequestException(
        'Параметр dateFrom не может быть позже dateTo',
      );
    }

    const roleId = await this.erpActorRoleResolverService.resolveRoleId({
      workspaceId: workspace.id,
      userWorkspaceId,
      apiKey,
    });

    await this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
      workspaceId: workspace.id,
      roleId,
      objectNameSingular: GL_ENTRY_OBJECT_NAME,
    });

    const html = await this.incomeStatementService.renderHtml(
      workspace.id,
      organizationId as string,
      dateFrom as string,
      dateTo as string,
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

  private validateDateParam(
    paramName: string,
    value: string | undefined,
  ): void {
    if (
      !isNonEmptyString(value) ||
      !DATE_ONLY_PATTERN.test(value) ||
      !isValidCalendarDate(value)
    ) {
      throw new BadRequestException(
        `Параметр ${paramName} обязателен и должен быть датой в формате ГГГГ-ММ-ДД`,
      );
    }
  }
}
