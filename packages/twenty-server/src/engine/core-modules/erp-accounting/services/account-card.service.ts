import { Injectable, NotFoundException } from '@nestjs/common';

import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import {
  type AccountCardAccountKind,
  type AccountCardDocumentRow,
  computeAccountCardRows,
  type RawAccountCardLeg,
} from 'src/engine/core-modules/erp-accounting/utils/compute-account-card.util';
import { renderAccountCardHtml } from 'src/engine/core-modules/erp-accounting/utils/render-account-card-html.util';
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
// 1 kopeck = 10_000 micros (see erp-sales-money.util.ts / trial-balance.service.ts).
const MICROS_PER_KOPECK = 10_000;
const DELETED_DOCUMENT_LABEL = '(удалён)';
const UNKNOWN_CORRESPONDING_ACCOUNT_CODE = '—';
const FALLBACK_ACCOUNT_KIND: AccountCardAccountKind = 'ACTIVE_PASSIVE';

export type AccountCardData = {
  organizationName: string;
  accountCode: string;
  accountName: string;
  dateFrom: string;
  dateTo: string;
  openingBalanceDebitKopecks: number;
  openingBalanceCreditKopecks: number;
  rows: AccountCardDocumentRow[];
  closingBalanceDebitKopecks: number;
  closingBalanceCreditKopecks: number;
  totalDebitKopecks: number;
  totalCreditKopecks: number;
};

// Карточка счёта (1С-паттерн): opening balance + chronological postings + a
// running balance for ONE account of the план счетов, over a period. Same
// shape of service as TrialBalanceService (SQL fetch here, pure compute in
// compute-account-card.util.ts, HTML render in its own util) — see that
// file's header comment for why the split exists.
@Injectable()
export class AccountCardService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getAccountCardData(
    workspaceId: string,
    organizationId: string,
    accountCode: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<AccountCardData> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () =>
        this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
          (transactionScope) =>
            this.loadAndCompute(
              workspaceId,
              organizationId,
              accountCode,
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
    accountCode: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<string> {
    const data = await this.getAccountCardData(
      workspaceId,
      organizationId,
      accountCode,
      dateFrom,
      dateTo,
    );

    return renderAccountCardHtml(data);
  }

  private async loadAndCompute(
    workspaceId: string,
    organizationId: string,
    accountCode: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<AccountCardData> {
    const organization = await transactionScope
      .getRepository<Record<string, unknown>>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      throw new NotFoundException(`Организация "${organizationId}" не найдена`);
    }

    // План счетов is workspace-global (not per-organization) — see
    // account.object.ts: code is the only lookup key.
    const account = await transactionScope
      .getRepository<Record<string, unknown>>(
        ACCOUNT_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ code: accountCode });

    if (!isDefined(account)) {
      throw new NotFoundException('Счёт не найден в плане счетов');
    }

    const accountId = String(account.id);
    const kind =
      (account.kind as AccountCardAccountKind | undefined) ??
      FALLBACK_ACCOUNT_KIND;

    const openingAggregate = await this.queryOpeningAggregate(
      workspaceId,
      organizationId,
      accountId,
      dateFrom,
      transactionScope,
    );
    const legs = await this.queryPeriodLegs(
      workspaceId,
      organizationId,
      accountId,
      dateFrom,
      dateTo,
      transactionScope,
    );

    const computation = computeAccountCardRows(legs, openingAggregate, kind);

    const correspondingAccountIds = [
      ...new Set(
        legs
          .map((leg) => leg.correspondingAccountId)
          .filter((id): id is string => isDefined(id)),
      ),
    ];
    const correspondingAccountCodesById = await this.loadAccountCodesById(
      correspondingAccountIds,
      transactionScope,
    );
    const documentLabelsByVoucher = await this.resolveDocumentLabels(
      legs,
      transactionScope,
    );

    const rows: AccountCardDocumentRow[] = computation.rows.map((row) => ({
      ...row,
      correspondingAccountCode: isDefined(row.correspondingAccountId)
        ? (correspondingAccountCodesById.get(row.correspondingAccountId) ??
          row.correspondingAccountId)
        : UNKNOWN_CORRESPONDING_ACCOUNT_CODE,
      documentLabel: this.buildDocumentLabel(
        row.voucherType,
        row.voucherId,
        documentLabelsByVoucher,
      ),
    }));

    const organizationName =
      typeof organization.fullName === 'string' &&
      organization.fullName.length > 0
        ? organization.fullName
        : typeof organization.name === 'string'
          ? organization.name
          : '';

    return {
      organizationName,
      accountCode:
        typeof account.code === 'string' ? account.code : accountCode,
      accountName: typeof account.name === 'string' ? account.name : '',
      dateFrom,
      dateTo,
      openingBalanceDebitKopecks: computation.openingBalance.debitKopecks,
      openingBalanceCreditKopecks: computation.openingBalance.creditKopecks,
      rows,
      closingBalanceDebitKopecks: computation.closingBalance.debitKopecks,
      closingBalanceCreditKopecks: computation.closingBalance.creditKopecks,
      totalDebitKopecks: computation.totalDebitKopecks,
      totalCreditKopecks: computation.totalCreditKopecks,
    };
  }

  private async loadAccountCodesById(
    accountIds: string[],
    transactionScope: WorkspaceTransactionScope,
  ): Promise<Map<string, string>> {
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
        typeof account.code === 'string' ? account.code : String(account.id),
      ]),
    );
  }

  // Ruling («документ: voucherType + резолв номера документа по voucherId»):
  // voucherType IS the document's objectNameSingular (see
  // gl-contributors.service.ts) — the same generic
  // getWorkspaceContext()/objectIdByNameSingular map trial-balance.service.ts
  // already uses for table names doubles as "the name map" here, resolving a
  // human labelSingular. A missing/deleted record (or a voucherType with no
  // matching object) prints "(удалён) <id>" per the ruling, never throws —
  // the карточка is a read-only history view, a dangling reference is data,
  // not an error.
  private async resolveDocumentLabels(
    legs: RawAccountCardLeg[],
    transactionScope: WorkspaceTransactionScope,
  ): Promise<Map<string, string>> {
    const voucherIdsByType = new Map<string, Set<string>>();

    for (const leg of legs) {
      if (!isDefined(leg.voucherType) || !isDefined(leg.voucherId)) {
        continue;
      }

      const ids = voucherIdsByType.get(leg.voucherType) ?? new Set<string>();

      ids.add(leg.voucherId);
      voucherIdsByType.set(leg.voucherType, ids);
    }

    const labelsByVoucherKey = new Map<string, string>();

    for (const [voucherType, idsSet] of voucherIdsByType) {
      const typeLabel = this.resolveVoucherTypeLabel(voucherType);
      const ids = [...idsSet];
      const records = await transactionScope
        .getRepository<Record<string, unknown>>(voucherType, BYPASS_PERMISSIONS)
        .findBy({ id: In(ids) });
      const recordsById = new Map(
        records.map((record) => [String(record.id), record]),
      );

      for (const id of ids) {
        const record = recordsById.get(id);
        const key = this.voucherKey(voucherType, id);

        labelsByVoucherKey.set(
          key,
          isDefined(record) &&
            typeof record.number === 'string' &&
            record.number.length > 0
            ? `${typeLabel} № ${record.number}`
            : `${DELETED_DOCUMENT_LABEL} ${id}`,
        );
      }
    }

    return labelsByVoucherKey;
  }

  private buildDocumentLabel(
    voucherType: string | null,
    voucherId: string | null,
    labelsByVoucherKey: Map<string, string>,
  ): string {
    if (!isDefined(voucherType) || !isDefined(voucherId)) {
      return DELETED_DOCUMENT_LABEL;
    }

    return (
      labelsByVoucherKey.get(this.voucherKey(voucherType, voucherId)) ??
      `${DELETED_DOCUMENT_LABEL} ${voucherId}`
    );
  }

  private voucherKey(voucherType: string, voucherId: string): string {
    return `${voucherType}:${voucherId}`;
  }

  // Defensive fallback (not an expected path — voucherType only ever comes
  // from our own gl-contributor registrations): an object metadata lookup
  // miss falls back to the raw voucherType string rather than throwing, same
  // spirit as trial-balance's orphan-account fallback.
  private resolveVoucherTypeLabel(voucherType: string): string {
    const { flatObjectMetadataMaps, objectIdByNameSingular } =
      getWorkspaceContext();
    const objectMetadataId = objectIdByNameSingular[voucherType];

    if (!isDefined(objectMetadataId)) {
      return voucherType;
    }

    const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityId: objectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    return flatObjectMetadata.labelSingular;
  }

  private async queryOpeningAggregate(
    workspaceId: string,
    organizationId: string,
    accountId: string,
    dateFrom: string,
    transactionScope: WorkspaceTransactionScope,
  ) {
    const glEntryTableReference = this.tableReference(
      workspaceId,
      GL_ENTRY_OBJECT_NAME,
    );

    const rows = await transactionScope.executeRawQuery(
      `SELECT
         COALESCE(SUM(CASE WHEN "debitAccountId" = $2 THEN "amountAmountMicros" ELSE 0 END), 0) AS opening_debit_micros,
         COALESCE(SUM(CASE WHEN "creditAccountId" = $2 THEN "amountAmountMicros" ELSE 0 END), 0) AS opening_credit_micros
       FROM ${glEntryTableReference}
       WHERE "organizationId" = $1
         AND ("debitAccountId" = $2 OR "creditAccountId" = $2)
         AND "date" < $3
         AND "deletedAt" IS NULL`,
      [organizationId, accountId, dateFrom],
    );

    return {
      openingDebitKopecks: this.microsToKopecks(rows[0]?.opening_debit_micros),
      openingCreditKopecks: this.microsToKopecks(
        rows[0]?.opening_credit_micros,
      ),
    };
  }

  // Two-legs UNION ALL, same technique as trial-balance's aggregate query,
  // but rows stay individual (no GROUP BY) — the карточка prints one line
  // per glEntry leg, not a per-account sum. Ordered chronologically
  // (date, then createdAt as the same-day tie-break — DATE has no time
  // component, and createdAt reflects actual posting order).
  private async queryPeriodLegs(
    workspaceId: string,
    organizationId: string,
    accountId: string,
    dateFrom: string,
    dateTo: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<RawAccountCardLeg[]> {
    const glEntryTableReference = this.tableReference(
      workspaceId,
      GL_ENTRY_OBJECT_NAME,
    );

    const rows = await transactionScope.executeRawQuery(
      `WITH legs AS (
         SELECT
           id, "date" AS entry_date, "amountAmountMicros" AS micros, TRUE AS is_debit,
           "creditAccountId" AS corr_account_id, "voucherType" AS voucher_type,
           "voucherId" AS voucher_id, "createdAt" AS created_at
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "debitAccountId" = $2 AND "deletedAt" IS NULL
           AND "date" >= $3 AND "date" <= $4
         UNION ALL
         SELECT
           id, "date", "amountAmountMicros", FALSE,
           "debitAccountId", "voucherType", "voucherId", "createdAt"
         FROM ${glEntryTableReference}
         WHERE "organizationId" = $1 AND "creditAccountId" = $2 AND "deletedAt" IS NULL
           AND "date" >= $3 AND "date" <= $4
       )
       SELECT * FROM legs ORDER BY entry_date ASC, created_at ASC`,
      [organizationId, accountId, dateFrom, dateTo],
    );

    return rows.map((row) => ({
      glEntryId: String(row.id),
      date: String(row.entry_date),
      isDebit: row.is_debit === true,
      amountKopecks: this.microsToKopecks(row.micros),
      correspondingAccountId: isDefined(row.corr_account_id)
        ? String(row.corr_account_id)
        : null,
      voucherType: isDefined(row.voucher_type)
        ? String(row.voucher_type)
        : null,
      voucherId: isDefined(row.voucher_id) ? String(row.voucher_id) : null,
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
