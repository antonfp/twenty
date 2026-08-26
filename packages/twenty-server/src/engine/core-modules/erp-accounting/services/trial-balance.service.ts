import { Injectable, NotFoundException } from '@nestjs/common';

import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import {
  type AccountMasterInfo,
  computeTrialBalanceRows,
  type RawAccountLegAggregate,
  type TrialBalanceRow,
  type TrialBalanceTotals,
} from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';
import { renderTrialBalanceHtml } from 'src/engine/core-modules/erp-accounting/utils/render-trial-balance-html.util';
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

export type TrialBalanceData = {
  organizationName: string;
  dateFrom: string;
  dateTo: string;
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
};

// Aggregates glEntry (SQL, table-name resolved like item-balance.service.ts/
// posting.service.ts) into the ОСВ per the ruling, then hands off to the pure
// compute/render utils. Runs outside any posting transaction — a plain
// read-only workspace transaction (runInWorkspaceTransaction), not
// PostingContext.
@Injectable()
export class TrialBalanceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getTrialBalanceData(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<TrialBalanceData> {
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
    const data = await this.getTrialBalanceData(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
    );

    return renderTrialBalanceHtml(data);
  }

  private async loadAndCompute(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<TrialBalanceData> {
    const organization = await transactionScope
      .getRepository<Record<string, unknown>>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      throw new NotFoundException(
        `Организация "${organizationId}" не найдена`,
      );
    }

    const aggregates = await this.queryLegAggregates(
      workspaceId,
      organizationId,
      dateFrom,
      dateTo,
      transactionScope,
    );
    const accountIds = aggregates.map((aggregate) => aggregate.accountId);
    const accountsById = await this.loadAccountsById(
      accountIds,
      transactionScope,
    );
    const { rows, totals } = computeTrialBalanceRows(
      aggregates,
      accountsById,
    );

    const organizationName =
      typeof organization.fullName === 'string' &&
      organization.fullName.length > 0
        ? organization.fullName
        : typeof organization.name === 'string'
          ? organization.name
          : '';

    return { organizationName, dateFrom, dateTo, rows, totals };
  }

  private async loadAccountsById(
    accountIds: string[],
    transactionScope: WorkspaceTransactionScope,
  ): Promise<Map<string, AccountMasterInfo>> {
    if (accountIds.length === 0) {
      return new Map();
    }

    const accounts = await transactionScope
      .getRepository<Record<string, unknown>>(
        ACCOUNT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findBy({ id: In(accountIds) });

    return new Map(
      accounts.map((account) => [
        String(account.id),
        {
          code:
            typeof account.code === 'string'
              ? account.code
              : String(account.id),
          name: typeof account.name === 'string' ? account.name : '',
          kind: (account.kind as AccountMasterInfo['kind']) ?? 'ACTIVE_PASSIVE',
        },
      ]),
    );
  }

  // Ruling («ОСВ» аггрегация): opening = Σ до dateFrom, turnover = Σ за
  // [dateFrom, dateTo]. Two legs per glEntry row (debit/credit) unioned so
  // the same query groups both sides per account; reversal rows are summed
  // in unfiltered — see compute-trial-balance.util.ts header comment.
  private async queryLegAggregates(
    workspaceId: string,
    organizationId: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<RawAccountLegAggregate[]> {
    const glEntryTableReference = this.tableReference(
      workspaceId,
      GL_ENTRY_OBJECT_NAME,
    );

    const rows = await transactionScope.executeRawQuery(
      `WITH legs AS (
         SELECT "debitAccountId" AS account_id, "amountAmountMicros" AS micros, "date" AS entry_date, TRUE AS is_debit
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "debitAccountId" IS NOT NULL AND "deletedAt" IS NULL
         UNION ALL
         SELECT "creditAccountId" AS account_id, "amountAmountMicros" AS micros, "date" AS entry_date, FALSE AS is_debit
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "creditAccountId" IS NOT NULL AND "deletedAt" IS NULL
       )
       SELECT
         account_id,
         COALESCE(SUM(CASE WHEN entry_date < $2 AND is_debit THEN micros ELSE 0 END), 0) AS opening_debit_micros,
         COALESCE(SUM(CASE WHEN entry_date < $2 AND NOT is_debit THEN micros ELSE 0 END), 0) AS opening_credit_micros,
         COALESCE(SUM(CASE WHEN entry_date >= $2 AND entry_date <= $3 AND is_debit THEN micros ELSE 0 END), 0) AS turnover_debit_micros,
         COALESCE(SUM(CASE WHEN entry_date >= $2 AND entry_date <= $3 AND NOT is_debit THEN micros ELSE 0 END), 0) AS turnover_credit_micros
       FROM legs
       GROUP BY account_id`,
      [organizationId, dateFrom, dateTo],
    );

    return rows.map((row) => ({
      accountId: String(row.account_id),
      openingDebitKopecks: this.microsToKopecks(row.opening_debit_micros),
      openingCreditKopecks: this.microsToKopecks(row.opening_credit_micros),
      turnoverDebitKopecks: this.microsToKopecks(row.turnover_debit_micros),
      turnoverCreditKopecks: this.microsToKopecks(row.turnover_credit_micros),
    }));
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
