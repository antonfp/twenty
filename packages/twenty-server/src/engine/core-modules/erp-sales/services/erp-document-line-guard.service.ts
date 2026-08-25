import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { In } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import {
  type CreateManyResolverArgs,
  type CreateOneResolverArgs,
  type DeleteManyResolverArgs,
  type DeleteOneResolverArgs,
  type MergeManyResolverArgs,
  type RestoreManyResolverArgs,
  type RestoreOneResolverArgs,
  type UpdateManyResolverArgs,
  type UpdateOneResolverArgs,
} from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import {
  ERP_UPSERT_BLOCKED_MESSAGE,
  type ErpDocumentGuardOperation,
} from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { extractRecordIdsFromFilter } from 'src/engine/core-modules/erp-sales/utils/extract-record-ids-from-filter.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

// Shared by every document-line object (salesInvoiceLine, supplierInvoiceLine, …):
// a line is only editable while its parent document is DRAFT. Kept as one
// object-agnostic service so sales and purchases don't each grow their own copy.
type DocumentLineGuardArgs = {
  workspaceId: string;
  lineObjectNameSingular: string;
  parentFieldName: string;
  parentObjectNameSingular: string;
  operation: ErpDocumentGuardOperation;
  payload: unknown;
};

const LINE_BLOCKED_MESSAGE = msg`Строки проведённого документа изменять нельзя — отмените проведение`;

@Injectable()
export class ErpDocumentLineGuardService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async assertLineMutationAllowed({
    workspaceId,
    lineObjectNameSingular,
    parentFieldName,
    parentObjectNameSingular,
    operation,
    payload,
  }: DocumentLineGuardArgs): Promise<void> {
    switch (operation) {
      case 'createOne': {
        this.assertNoUpsert((payload as CreateOneResolverArgs).upsert);

        const data = (payload as CreateOneResolverArgs).data ?? {};

        await this.assertParentIdsAreDraft(
          workspaceId,
          parentObjectNameSingular,
          [
            this.extractParentId(
              data as Record<string, unknown>,
              parentFieldName,
            ),
          ],
        );

        return;
      }
      case 'createMany': {
        this.assertNoUpsert((payload as CreateManyResolverArgs).upsert);

        const parentIds = ((payload as CreateManyResolverArgs).data ?? []).map(
          (data) =>
            this.extractParentId(
              data as Record<string, unknown>,
              parentFieldName,
            ),
        );

        await this.assertParentIdsAreDraft(
          workspaceId,
          parentObjectNameSingular,
          parentIds,
        );

        return;
      }
      case 'updateOne': {
        const { id, data } = payload as UpdateOneResolverArgs;

        await this.assertLineRecordsHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          [id],
        );
        // Also check the parent this update would move the line onto —
        // the current-parent check above only sees where it is today.
        await this.assertParentIdsAreDraft(
          workspaceId,
          parentObjectNameSingular,
          [this.extractParentId(data as Record<string, unknown>, parentFieldName)],
        );

        return;
      }
      case 'updateMany': {
        const { filter, data } = payload as UpdateManyResolverArgs;

        await this.assertFilteredLinesHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          filter,
        );
        await this.assertParentIdsAreDraft(
          workspaceId,
          parentObjectNameSingular,
          [this.extractParentId(data as Record<string, unknown>, parentFieldName)],
        );

        return;
      }
      case 'deleteOne':
      case 'destroyOne': {
        const { id } = payload as DeleteOneResolverArgs;

        await this.assertLineRecordsHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          [id],
        );

        return;
      }
      case 'deleteMany':
      case 'destroyMany': {
        const { filter } = payload as DeleteManyResolverArgs;

        await this.assertFilteredLinesHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          filter,
        );

        return;
      }
      case 'restoreOne': {
        const { id } = payload as RestoreOneResolverArgs;

        // The line itself is soft-deleted, so it's invisible to a plain
        // lookup — must query withDeleted or the guard silently no-ops.
        await this.assertLineRecordsHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          [id],
          { withDeleted: true },
        );

        return;
      }
      case 'restoreMany': {
        const { filter } = payload as RestoreManyResolverArgs;

        await this.assertFilteredLinesHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          filter,
          { withDeleted: true },
        );

        return;
      }
      case 'mergeMany': {
        const { ids } = payload as MergeManyResolverArgs;

        await this.assertLineRecordsHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          ids,
        );

        return;
      }
    }
  }

  private assertNoUpsert(upsert: boolean | undefined): void {
    if (upsert === true) {
      throw new CommonQueryRunnerException(
        `Upsert is not allowed on ERP document line object`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: ERP_UPSERT_BLOCKED_MESSAGE,
        },
      );
    }
  }

  private extractParentId(
    data: Record<string, unknown>,
    parentFieldName: string,
  ): unknown {
    return data[parentFieldName];
  }

  private async assertFilteredLinesHaveDraftParent(
    workspaceId: string,
    lineObjectNameSingular: string,
    parentFieldName: string,
    parentObjectNameSingular: string,
    filter: unknown,
    options?: { withDeleted?: boolean },
  ): Promise<void> {
    const lineIds = extractRecordIdsFromFilter(filter);

    // Fail closed: a filter that is not bounded by ids cannot be checked
    // line-by-line for a POSTED parent.
    if (!isDefined(lineIds)) {
      throw new CommonQueryRunnerException(
        `Bulk mutation filter on "${lineObjectNameSingular}" is not bounded by record ids`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Массовая операция со строками документа возможна только по выбранным записям.`,
        },
      );
    }

    await this.assertLineRecordsHaveDraftParent(
      workspaceId,
      lineObjectNameSingular,
      parentFieldName,
      parentObjectNameSingular,
      lineIds,
      options,
    );
  }

  private async assertLineRecordsHaveDraftParent(
    workspaceId: string,
    lineObjectNameSingular: string,
    parentFieldName: string,
    parentObjectNameSingular: string,
    lineIds: string[],
    options?: { withDeleted?: boolean },
  ): Promise<void> {
    if (lineIds.length === 0) {
      return;
    }

    const lines =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const repository = await this.globalWorkspaceOrmManager.getRepository<
            Record<string, unknown>
          >(workspaceId, lineObjectNameSingular, {
            shouldBypassPermissionChecks: true,
          });

          return repository.find({
            where: { id: In(lineIds) },
            withDeleted: options?.withDeleted,
          });
        },
        buildSystemAuthContext(workspaceId),
      );

    const parentIds = lines.map((line) => line[parentFieldName]);

    await this.assertParentIdsAreDraft(
      workspaceId,
      parentObjectNameSingular,
      parentIds,
      options,
    );
  }

  private async assertParentIdsAreDraft(
    workspaceId: string,
    parentObjectNameSingular: string,
    parentIds: unknown[],
    options?: { withDeleted?: boolean },
  ): Promise<void> {
    // A line without a parent (id null/undefined) is allowed unconditionally.
    const uniqueParentIds = Array.from(
      new Set(
        parentIds.filter(
          (parentId): parentId is string => typeof parentId === 'string',
        ),
      ),
    );

    if (uniqueParentIds.length === 0) {
      return;
    }

    const parents =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const repository =
            await this.globalWorkspaceOrmManager.getRepository<{
              id: string;
              docStatus: string;
            }>(workspaceId, parentObjectNameSingular, {
              shouldBypassPermissionChecks: true,
            });

          return repository.find({
            where: { id: In(uniqueParentIds) },
            withDeleted: options?.withDeleted,
          });
        },
        buildSystemAuthContext(workspaceId),
      );

    const nonDraftParent = parents.find(
      (parent) => parent.docStatus !== DOC_STATUS.DRAFT,
    );

    if (isDefined(nonDraftParent)) {
      throw new CommonQueryRunnerException(
        `Parent "${parentObjectNameSingular}" record "${nonDraftParent.id}" is ${nonDraftParent.docStatus}; its lines cannot be modified`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: LINE_BLOCKED_MESSAGE,
        },
      );
    }
  }
}
