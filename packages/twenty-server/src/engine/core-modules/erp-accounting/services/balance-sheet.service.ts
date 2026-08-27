import { Injectable, NotFoundException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import {
  type BalanceSheetLineValue,
  type BalanceSheetTotals,
  computeBalanceSheetLines,
} from 'src/engine/core-modules/erp-accounting/utils/compute-balance-sheet.util';
import { previousYearEndDate } from 'src/engine/core-modules/erp-accounting/utils/report-comparative-period.util';
import { renderBalanceSheetHtml } from 'src/engine/core-modules/erp-accounting/utils/render-balance-sheet-html.util';
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

export type BalanceSheetData = {
  organizationName: string;
  organizationInn: string;
  organizationKpp: string;
  reportDate: string;
  previousReportDate: string;
  lines: BalanceSheetLineValue[];
  totals: BalanceSheetTotals;
};

// Same pattern as trial-balance.service.ts: raw-SQL aggregation over glEntry
// (table-name resolved like item-balance.service.ts/posting.service.ts),
// handed off to the pure compute/render utils. Runs outside any posting
// transaction — a plain read-only workspace transaction
// (runInWorkspaceTransaction), not PostingContext.
@Injectable()
export class BalanceSheetService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getBalanceSheetData(
    workspaceId: string,
    organizationId: string,
    date: string,
  ): Promise<BalanceSheetData> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          (transactionScope) =>
            this.loadAndCompute(
              workspaceId,
              organizationId,
              date,
              transactionScope,
            ),
        ),
      buildSystemAuthContext(workspaceId),
    );
  }

  async renderHtml(
    workspaceId: string,
    organizationId: string,
    date: string,
  ): Promise<string> {
    const data = await this.getBalanceSheetData(
      workspaceId,
      organizationId,
      date,
    );

    return renderBalanceSheetHtml(data);
  }

  private async loadAndCompute(
    workspaceId: string,
    organizationId: string,
    date: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<BalanceSheetData> {
    const organization = await transactionScope
      .getRepository<Record<string, unknown>>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      throw new NotFoundException(`Организация "${organizationId}" не найдена`);
    }

    const previousReportDate = previousYearEndDate(date);
    // Sequential, not Promise.all: both queries share the same transaction
    // scope's single pg client — issuing them concurrently would interleave
    // on one connection instead of running as two independent round trips.
    const currentNetByCode = await this.queryNetBalances(
      workspaceId,
      organizationId,
      date,
      transactionScope,
    );
    const previousNetByCode = await this.queryNetBalances(
      workspaceId,
      organizationId,
      previousReportDate,
      transactionScope,
    );

    const { lines, totals } = computeBalanceSheetLines(
      currentNetByCode,
      previousNetByCode,
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
      reportDate: date,
      previousReportDate,
      lines,
      totals,
    };
  }

  // Net (Дт−Кт) balance as of `asOfDate` (inclusive), grouped by account
  // CODE directly via a JOIN — unlike trial-balance.service.ts, no
  // accountId→AccountMasterInfo lookup step is needed: the balance-sheet
  // line mapping (compute-balance-sheet.util.ts) is keyed by a fixed,
  // known set of codes, not by account.kind from the database.
  private async queryNetBalances(
    workspaceId: string,
    organizationId: string,
    asOfDate: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<Map<string, number>> {
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
         WHERE ge."organizationId" = $1 AND ge."date" <= $2 AND ge."deletedAt" IS NULL
         UNION ALL
         SELECT a."code", ge."amountAmountMicros", FALSE
         FROM ${glEntryTableReference} ge
         JOIN ${accountTableReference} a ON a."id" = ge."creditAccountId"
         WHERE ge."organizationId" = $1 AND ge."date" <= $2 AND ge."deletedAt" IS NULL
       )
       SELECT account_code, COALESCE(SUM(CASE WHEN is_debit THEN micros ELSE -micros END), 0) AS net_micros
       FROM legs
       GROUP BY account_code`,
      [organizationId, asOfDate],
    );

    return new Map(
      rows.map((row) => [
        String(row.account_code),
        this.microsToKopecks(row.net_micros),
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
