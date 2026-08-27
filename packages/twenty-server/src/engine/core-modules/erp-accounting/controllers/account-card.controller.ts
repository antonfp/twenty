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
import { AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
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

// Same round-trip-through-UTC check as trial-balance.controller.ts — rejects
// a syntactically matching but impossible date (e.g. "2026-02-30").
const isValidCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Same registration mechanism as TrialBalanceController (registered before
// RestApiModule's `rest/*path` catch-all). The permission check below (read
// on glEntry, the register this report reads) is the actual enforcement —
// CustomPermissionGuard only documents that a check happens here.
@Controller(`${ApiPath.Rest}/erp/reports`)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
@UseFilters(RestApiExceptionFilter)
export class AccountCardController {
  constructor(
    private readonly accountCardService: AccountCardService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly erpActorRoleResolverService: ErpActorRoleResolverService,
  ) {}

  @Get('account-card')
  async getAccountCard(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId({ allowUndefined: true })
    userWorkspaceId: string | undefined,
    @AuthApiKey() apiKey: FlatApiKey | undefined,
    @Query('organizationId') organizationId: string | undefined,
    @Query('accountCode') accountCode: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    this.validateParams(organizationId, accountCode, dateFrom, dateTo);

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

    // account-card.service.ts throws NotFoundException("Счёт не найден в
    // плане счетов") for an unknown accountCode — RestApiExceptionFilter
    // turns that into the 404 RU response the ruling asks for.
    const html = await this.accountCardService.renderHtml(
      workspace.id,
      organizationId as string,
      accountCode as string,
      dateFrom as string,
      dateTo as string,
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }

  private validateParams(
    organizationId: string | undefined,
    accountCode: string | undefined,
    dateFrom: string | undefined,
    dateTo: string | undefined,
  ): void {
    if (
      !isNonEmptyString(organizationId) ||
      !UUID_PATTERN.test(organizationId)
    ) {
      throw new BadRequestException(
        'Параметр organizationId обязателен и должен быть корректным UUID',
      );
    }

    if (!isNonEmptyString(accountCode)) {
      throw new BadRequestException('Параметр accountCode обязателен');
    }

    if (
      !isNonEmptyString(dateFrom) ||
      !DATE_ONLY_PATTERN.test(dateFrom) ||
      !isValidCalendarDate(dateFrom)
    ) {
      throw new BadRequestException(
        'Параметр dateFrom обязателен и должен быть датой в формате ГГГГ-ММ-ДД',
      );
    }

    if (
      !isNonEmptyString(dateTo) ||
      !DATE_ONLY_PATTERN.test(dateTo) ||
      !isValidCalendarDate(dateTo)
    ) {
      throw new BadRequestException(
        'Параметр dateTo обязателен и должен быть датой в формате ГГГГ-ММ-ДД',
      );
    }

    if (dateFrom > dateTo) {
      throw new BadRequestException(
        'Параметр dateFrom не может быть позже dateTo',
      );
    }
  }
}
