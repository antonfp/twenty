import { Injectable, NotFoundException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import {
  type AccountTurnover,
  computeIncomeStatementLines,
  INCOME_STATEMENT_ACCOUNT_CODES,
  type IncomeStatementLineValue,
} from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';
import { previousYearPeriod } from 'src/engine/core-modules/erp-accounting/utils/report-comparative-period.util';
import { renderIncomeStatementHtml } from 'src/engine/core-modules/erp-accounting/utils/render-income-statement-html.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

const GL_ENTRY_OBJECT_NAME = 'glEntry';
const ACCOUNT_OBJECT_NAME = 'account';
const ORGANIZATION_OBJECT_NAME = 'organization';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// 1 kopeck = 10_000 micros (see erp-sales-money.util.ts).
const MICROS_PER_KOPECK = 10_000;

export type IncomeStatementData = {
  organizationName: string;
  organizationInn: string;
  organizationKpp: string;
  dateFrom: string;
  dateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  lines: IncomeStatementLineValue[];
};

// Same pattern as trial-balance.service.ts/balance-sheet.service.ts: raw-SQL
// turnover aggregation over glEntry, handed to the pure compute/render
// utils. CRITICAL ruling (compute-income-statement.util.ts header comment,
// ofr-spec.md §3.3): the SQL below restricts accounts to the explicit
// INCOME_STATEMENT_ACCOUNT_CODES allow-list — never a `code LIKE '90.%'`
// pattern — so a future 90.09/91.09 (Task 5 «Закрытие месяца») can never
// silently enter this aggregation.
@Injectable()
export class IncomeStatementService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getIncomeStatementData(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<IncomeStatementData> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          (transactionScope) =>
            this.loadAndCompute(
              workspaceId,
              organizationId,
              dateFrom,
              dateTo,
              transactionScope,
            ),
        ),
      buildSystemAuthContext(workspaceId),
    );
  }

  async renderHtml(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<string> {
    const data = await this.getIncomeStatementData(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
    );

    return renderIncomeStatementHtml(data);
  }

  private async loadAndCompute(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<IncomeStatementData> {
    const organization = await transactionScope
      .getRepository<Record<string, unknown>>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      throw new NotFoundException(`Организация "${organizationId}" не найдена`);
    }

    const previousPeriod = previousYearPeriod(dateFrom, dateTo);
    // Sequential — same single-connection reasoning as balance-sheet.service.ts.
    const currentTurnoverByCode = await this.queryTurnovers(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
      transactionScope,
    );
    const previousTurnoverByCode = await this.queryTurnovers(
      workspaceId,
      organizationId,
      previousPeriod.dateFrom,
      previousPeriod.dateTo,
      transactionScope,
    );

    const lines = computeIncomeStatementLines(
      currentTurnoverByCode,
      previousTurnoverByCode,
    );

    const organizationName =
      typeof organization.fullName === 'string' &&
      organization.fullName.length > 0
        ? organization.fullName
        : typeof organization.name === 'string'
          ? organization.name
          : '';
    const organizationInn =
      typeof organization.inn === 'string' ? organization.inn : '';
    const organizationKpp =
      typeof organization.kpp === 'string' ? organization.kpp : '';

    return {
      organizationName,
      organizationInn,
      organizationKpp,
      dateFrom,
      dateTo,
      previousDateFrom: previousPeriod.dateFrom,
      previousDateTo: previousPeriod.dateTo,
      lines,
    };
  }

  // Turnover (Σ debit, Σ credit — separately, no netting) over
  // [dateFrom,dateTo], grouped by account CODE, restricted to the explicit
  // INCOME_STATEMENT_ACCOUNT_CODES allow-list (see class header comment).
  private async queryTurnovers(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<Map<string, AccountTurnover>> {
    const glEntryTableReference = this.tableReference(
      workspaceId,
      GL_ENTRY_OBJECT_NAME,
    );
    const accountTableReference = this.tableReference(
      workspaceId,
      ACCOUNT_OBJECT_NAME,
    );

    const rows = await transactionScope.executeRawQuery(
      `WITH legs AS (
         SELECT a."code" AS account_code, ge."amountAmountMicros" AS micros, TRUE AS is_debit
         FROM ${glEntryTableReference} ge
         JOIN ${accountTableReference} a ON a."id" = ge."debitAccountId"
         WHERE ge."organizationId" = $1 AND ge."date" >= $2 AND ge."date" <= $3
           AND ge."deletedAt" IS NULL AND a."code" = ANY($4::text[])
         UNION ALL
         SELECT a."code", ge."amountAmountMicros", FALSE
         FROM ${glEntryTableReference} ge
         JOIN ${accountTableReference} a ON a."id" = ge."creditAccountId"
         WHERE ge."organizationId" = $1 AND ge."date" >= $2 AND ge."date" <= $3
           AND ge."deletedAt" IS NULL AND a."code" = ANY($4::text[])
       )
       SELECT account_code,
         COALESCE(SUM(CASE WHEN is_debit THEN micros ELSE 0 END), 0) AS turnover_debit_micros,
         COALESCE(SUM(CASE WHEN NOT is_debit THEN micros ELSE 0 END), 0) AS turnover_credit_micros
       FROM legs
       GROUP BY account_code`,
      [organizationId, dateFrom, dateTo, INCOME_STATEMENT_ACCOUNT_CODES],
    );

    return new Map(
      rows.map((row) => [
        String(row.account_code),
        {
          debitKopecks: this.microsToKopecks(row.turnover_debit_micros),
          creditKopecks: this.microsToKopecks(row.turnover_credit_micros),
        },
      ]),
    );
  }

  // node-postgres returns SUM(bigint) aggregates as numeric strings.
  private microsToKopecks(value: unknown): number {
    return Math.round(Number(value ?? 0) / MICROS_PER_KOPECK);
  }

  private tableReference(
    workspaceId: string,
    objectNameSingular: string,
  ): string {
    const { flatObjectMetadataMaps, objectIdByNameSingular } =
      getWorkspaceContext();
    const objectMetadataId = objectIdByNameSingular[objectNameSingular];

    if (!isDefined(objectMetadataId)) {
      throw new NotFoundException(
        `Object "${objectNameSingular}" does not exist in workspace "${workspaceId}"`,
      );
    }

    const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityId: objectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    return `${escapeIdentifier(
      getWorkspaceSchemaName(workspaceId),
    )}.${escapeIdentifier(computeObjectTargetTable(flatObjectMetadata))}`;
  }
}
