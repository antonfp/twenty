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
  type UpdateManyResolverArgs,
  type UpdateOneResolverArgs,
} from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentGuardOperation } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
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
        const { id } = payload as UpdateOneResolverArgs;

        await this.assertLineRecordsHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          [id],
        );

        return;
      }
      case 'updateMany': {
        const { filter } = payload as UpdateManyResolverArgs;

        await this.assertFilteredLinesHaveDraftParent(
          workspaceId,
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          filter,
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
    );
  }

  private async assertLineRecordsHaveDraftParent(
    workspaceId: string,
    lineObjectNameSingular: string,
    parentFieldName: string,
    parentObjectNameSingular: string,
    lineIds: string[],
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

          return repository.findBy({ id: In(lineIds) });
        },
        buildSystemAuthContext(workspaceId),
      );

    const parentIds = lines.map((line) => line[parentFieldName]);

    await this.assertParentIdsAreDraft(
      workspaceId,
      parentObjectNameSingular,
      parentIds,
    );
  }

  private async assertParentIdsAreDraft(
    workspaceId: string,
    parentObjectNameSingular: string,
    parentIds: unknown[],
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

          return repository.findBy({ id: In(uniqueParentIds) });
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
