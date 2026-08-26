import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import {
  ALL_ERP_REGISTER_OBJECT_NAMES,
  ERP_REGISTER_OBJECT_NAMES,
} from 'src/engine/core-modules/erp/constants/erp-register-object-names.constant';
import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { GlContributorRegistry } from 'src/engine/core-modules/erp/gl-contributor.registry';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PartyLedgerEntryInput,
  type PostingContext,
  type StockLedgerEntryInput,
} from 'src/engine/core-modules/erp/types/posting.types';
import { buildReversalRows } from 'src/engine/core-modules/erp/utils/build-reversal-rows.util';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

type DocumentOperationArgs = {
  workspaceId: string;
  objectNameSingular: string;
  recordId: string;
};

@Injectable()
export class PostingService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly periodLockService: PeriodLockService,
    private readonly glContributorRegistry: GlContributorRegistry,
  ) {}

  async post(
    workspaceId: string,
    objectNameSingular: string,
    recordId: string,
  ): Promise<void> {
    try {
      await this.runInWorkspaceTransaction(workspaceId, (transactionScope) =>
        this.postInTransaction(
          { workspaceId, objectNameSingular, recordId },
          transactionScope,
        ),
      );
    } catch (error) {
      this.rethrowAsPostingException(error);
    }
  }

  async cancel(
    workspaceId: string,
    objectNameSingular: string,
    recordId: string,
  ): Promise<void> {
    try {
      await this.runInWorkspaceTransaction(workspaceId, (transactionScope) =>
        this.cancelInTransaction(
          { workspaceId, objectNameSingular, recordId },
          transactionScope,
        ),
      );
    } catch (error) {
      this.rethrowAsPostingException(error);
    }
  }

  private async postInTransaction(
    { workspaceId, objectNameSingular, recordId }: DocumentOperationArgs,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<void> {
    const lockedRow = await this.lockDocumentRow({
      workspaceId,
      objectNameSingular,
      recordId,
      transactionScope,
    });

    if (lockedRow.docStatus !== DOC_STATUS.DRAFT) {
      throw new ErpPostingException(
        `Cannot post document "${recordId}" of "${objectNameSingular}": status is ${lockedRow.docStatus}, expected ${DOC_STATUS.DRAFT}`,
        ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
      );
    }

    const providers =
      this.postingRulesRegistry.resolvePostingRules(objectNameSingular);

    if (providers.length === 0) {
      throw new ErpPostingException(
        `No posting rules registered for object "${objectNameSingular}"`,
        ERP_POSTING_EXCEPTION_CODE.NO_POSTING_RULES,
      );
    }

    const documentRepository =
      transactionScope.getRepository<ErpDocumentRecord>(
        objectNameSingular,
        BYPASS_PERMISSIONS,
      );
    const document = await documentRepository.findOneByOrFail({
      id: recordId,
    });
    const lines = await this.loadDocumentLines(
      objectNameSingular,
      recordId,
      transactionScope,
    );

    const postingContext: PostingContext = {
      workspaceId,
      documentObjectName: objectNameSingular,
      documentId: recordId,
      postingDate: this.resolvePostingDate(document),
      transactionScope,
    };

    await this.periodLockService.assertPeriodOpen({
      organizationId: document.organizationId,
      postingDate: postingContext.postingDate,
      transactionScope,
    });

    for (const provider of providers) {
      await provider.validate?.(postingContext, document, lines);
    }

    const partyEntries: PartyLedgerEntryInput[] = [];
    const stockEntries: StockLedgerEntryInput[] = [];

    for (const provider of providers) {
      partyEntries.push(
        ...((await provider.getPartyEntries?.(
          postingContext,
          document,
          lines,
        )) ?? []),
      );
      stockEntries.push(
        ...((await provider.getStockEntries?.(
          postingContext,
          document,
          lines,
        )) ?? []),
      );
    }

    // Взаиморасчёты first, per the register write order of the posting plan.
    await this.insertRegisterRows(
      ERP_REGISTER_OBJECT_NAMES.PARTY_LEDGER_ENTRY,
      partyEntries,
      transactionScope,
    );
    await this.insertRegisterRows(
      ERP_REGISTER_OBJECT_NAMES.STOCK_LEDGER_ENTRY,
      stockEntries,
      transactionScope,
    );
    await this.insertGlContributionRows(postingContext, transactionScope);

    await documentRepository.update(recordId, {
      docStatus: DOC_STATUS.POSTED,
      postedAt: new Date().toISOString(),
    });
  }

  private async cancelInTransaction(
    { workspaceId, objectNameSingular, recordId }: DocumentOperationArgs,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<void> {
    const lockedRow = await this.lockDocumentRow({
      workspaceId,
      objectNameSingular,
      recordId,
      transactionScope,
    });

    if (lockedRow.docStatus !== DOC_STATUS.POSTED) {
      throw new ErpPostingException(
        `Cannot cancel document "${recordId}" of "${objectNameSingular}": status is ${lockedRow.docStatus}, expected ${DOC_STATUS.POSTED}`,
        ERP_POSTING_EXCEPTION_CODE.INVALID_DOC_STATUS,
      );
    }

    const documentRepository =
      transactionScope.getRepository<ErpDocumentRecord>(
        objectNameSingular,
        BYPASS_PERMISSIONS,
      );
    const document = await documentRepository.findOneByOrFail({
      id: recordId,
    });
    const cancelContext: PostingContext = {
      workspaceId,
      documentObjectName: objectNameSingular,
      documentId: recordId,
      postingDate: this.resolvePostingDate(document),
      transactionScope,
    };

    // Ruling (lock date): cancel of a document inside a closed period is
    // rejected the same way as post.
    await this.periodLockService.assertPeriodOpen({
      organizationId: document.organizationId,
      postingDate: cancelContext.postingDate,
      transactionScope,
    });

    const { objectIdByNameSingular } = getWorkspaceContext();

    for (const registerObjectName of ALL_ERP_REGISTER_OBJECT_NAMES) {
      if (!isDefined(objectIdByNameSingular[registerObjectName])) {
        continue;
      }

      const registerRepository = transactionScope.getRepository<
        Record<string, unknown>
      >(registerObjectName, BYPASS_PERMISSIONS);

      const originalRows = await registerRepository.findBy({
        voucherType: objectNameSingular,
        voucherId: recordId,
        isCancellation: false,
      });

      if (originalRows.length === 0) {
        continue;
      }

      await registerRepository.insert(buildReversalRows(originalRows));
      await registerRepository.update(
        originalRows.map((originalRow) => String(originalRow.id)),
        { isCancelled: true },
      );
    }

    const cancelProviders = this.postingRulesRegistry
      .resolvePostingRules(objectNameSingular)
      .filter((provider) => isDefined(provider.onCancel));

    for (const provider of cancelProviders) {
      await provider.onCancel?.(cancelContext, document);
    }

    await documentRepository.update(recordId, {
      docStatus: DOC_STATUS.CANCELLED,
      cancelledAt: new Date().toISOString(),
    });
  }

  // FOR UPDATE serializes concurrent post/cancel of the same document: the
  // second transaction blocks here, then fails the docStatus assert.
  private async lockDocumentRow({
    workspaceId,
    objectNameSingular,
    recordId,
    transactionScope,
  }: DocumentOperationArgs & {
    transactionScope: WorkspaceTransactionScope;
  }): Promise<{ id: string; docStatus: string }> {
    const { flatObjectMetadataMaps, objectIdByNameSingular } =
      getWorkspaceContext();
    const objectMetadataId = objectIdByNameSingular[objectNameSingular];

    if (!isDefined(objectMetadataId)) {
      throw new ErpPostingException(
        `Object "${objectNameSingular}" does not exist in workspace "${workspaceId}"`,
        ERP_POSTING_EXCEPTION_CODE.UNKNOWN_DOCUMENT_OBJECT,
      );
    }

    const flatObjectMetadata = findFlatEntityByIdInFlatEntityMapsOrThrow({
      flatEntityId: objectMetadataId,
      flatEntityMaps: flatObjectMetadataMaps,
    });

    const documentTableReference = `${escapeIdentifier(
      getWorkspaceSchemaName(workspaceId),
    )}.${escapeIdentifier(computeObjectTargetTable(flatObjectMetadata))}`;

    const rows = await transactionScope.executeRawQuery(
      `SELECT "id", "docStatus" FROM ${documentTableReference} WHERE "id" = $1 AND "deletedAt" IS NULL FOR UPDATE`,
      [recordId],
    );

    if (rows.length === 0) {
      throw new ErpPostingException(
        `Document "${recordId}" of "${objectNameSingular}" not found`,
        ERP_POSTING_EXCEPTION_CODE.DOCUMENT_NOT_FOUND,
      );
    }

    return rows[0] as { id: string; docStatus: string };
  }

  private async insertRegisterRows(
    registerObjectName: string,
    rows: Record<string, unknown>[],
    transactionScope: WorkspaceTransactionScope,
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    // Register rows are system-written; the createdBy actor composite is
    // NOT NULL on workspace tables, so stamp it centrally for every register.
    const systemActor = { source: 'SYSTEM', name: 'ERPilot', context: {} };
    const stampedRows = rows.map((row) => ({
      createdBy: systemActor,
      updatedBy: systemActor,
      ...row,
    }));

    await transactionScope
      .getRepository<Record<string, unknown>>(
        registerObjectName,
        BYPASS_PERMISSIONS,
      )
      .insert(stampedRows);
  }

  // Glue-архитектура GL (ruling): проводки пишет контрибьютор из
  // erp-accounting — только когда объект glEntry установлен в workspace
  // (блок «Бухгалтерия» опционален: без него проведение идёт без проводок).
  // Document and lines are re-read because the main providers just wrote
  // totals/numbering the contributor depends on.
  private async insertGlContributionRows(
    context: PostingContext,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<void> {
    const { objectIdByNameSingular } = getWorkspaceContext();

    if (
      !isDefined(objectIdByNameSingular[ERP_REGISTER_OBJECT_NAMES.GL_ENTRY])
    ) {
      return;
    }

    const contributor = this.glContributorRegistry.resolveGlContributor(
      context.documentObjectName,
    );

    if (!isDefined(contributor)) {
      return;
    }

    const document = await transactionScope
      .getRepository<ErpDocumentRecord>(
        context.documentObjectName,
        BYPASS_PERMISSIONS,
      )
      .findOneByOrFail({ id: context.documentId });
    const lines = await this.loadDocumentLines(
      context.documentObjectName,
      context.documentId,
      transactionScope,
    );

    const glEntryRows = await contributor(context, document, lines);

    await this.insertRegisterRows(
      ERP_REGISTER_OBJECT_NAMES.GL_ENTRY,
      glEntryRows,
      transactionScope,
    );
  }

  // Convention: document lines live in `${objectName}Line` with a
  // `${objectName}Id` join column; documents without a lines object get [].
  private async loadDocumentLines(
    objectNameSingular: string,
    recordId: string,
    transactionScope: WorkspaceTransactionScope,
  ): Promise<ErpDocumentLineRecord[]> {
    const linesObjectName = `${objectNameSingular}Line`;
    const { objectIdByNameSingular } = getWorkspaceContext();

    if (!isDefined(objectIdByNameSingular[linesObjectName])) {
      return [];
    }

    return transactionScope
      .getRepository<ErpDocumentLineRecord>(linesObjectName, BYPASS_PERMISSIONS)
      .findBy({ [`${objectNameSingular}Id`]: recordId });
  }

  private resolvePostingDate(document: ErpDocumentRecord): string {
    const candidate = document.postingDate ?? document.docDate;

    if (typeof candidate === 'string') {
      return candidate;
    }

    if (candidate instanceof Date) {
      return candidate.toISOString();
    }

    return new Date().toISOString();
  }

  private async runInWorkspaceTransaction<TResult>(
    workspaceId: string,
    work: (transactionScope: WorkspaceTransactionScope) => Promise<TResult>,
  ): Promise<TResult> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () => this.globalWorkspaceOrmManager.runInWorkspaceTransaction(work),
      authContext,
    );
  }

  private rethrowAsPostingException(error: unknown): never {
    if (error instanceof ErpPostingException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    throw new ErpPostingException(
      `Posting transaction failed: ${message}`,
      ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
    );
  }
}
