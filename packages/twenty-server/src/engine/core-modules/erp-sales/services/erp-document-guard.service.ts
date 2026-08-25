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
import { extractRecordIdsFromFilter } from 'src/engine/core-modules/erp-sales/utils/extract-record-ids-from-filter.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

export type ErpDocumentGuardOperation =
  | 'createOne'
  | 'createMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'destroyOne'
  | 'destroyMany';

// Fields owned by the posting flow; letting clients set them would fake a
// posted/paid state without register rows.
const POSTING_MANAGED_FIELD_NAMES: readonly string[] = [
  'postedAt',
  'cancelledAt',
  'paidAmount',
  'paymentStatus',
];

type DocumentGuardArgs = {
  workspaceId: string;
  objectNameSingular: string;
  operation: ErpDocumentGuardOperation;
  payload: unknown;
};

@Injectable()
export class ErpDocumentGuardService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async assertDocumentMutationAllowed({
    workspaceId,
    objectNameSingular,
    operation,
    payload,
  }: DocumentGuardArgs): Promise<void> {
    switch (operation) {
      case 'createOne': {
        this.assertCreateDataIsDraft(
          (payload as CreateOneResolverArgs).data ?? {},
        );

        return;
      }
      case 'createMany': {
        for (const data of (payload as CreateManyResolverArgs).data ?? []) {
          this.assertCreateDataIsDraft(data);
        }

        return;
      }
      case 'updateOne': {
        const { id, data } = payload as UpdateOneResolverArgs;

        this.assertNoPostingManagedFields(data ?? {});
        await this.assertRecordsAreDraft(workspaceId, objectNameSingular, [
          id,
        ]);

        return;
      }
      case 'updateMany': {
        const { filter, data } = payload as UpdateManyResolverArgs;

        this.assertNoPostingManagedFields(data ?? {});
        await this.assertFilteredRecordsAreDraft(
          workspaceId,
          objectNameSingular,
          filter,
        );

        return;
      }
      case 'deleteOne':
      case 'destroyOne': {
        await this.assertRecordsAreDraft(workspaceId, objectNameSingular, [
          (payload as DeleteOneResolverArgs).id,
        ]);

        return;
      }
      case 'deleteMany':
      case 'destroyMany': {
        await this.assertFilteredRecordsAreDraft(
          workspaceId,
          objectNameSingular,
          (payload as DeleteManyResolverArgs).filter,
        );

        return;
      }
    }
  }

  private assertCreateDataIsDraft(data: Record<string, unknown>): void {
    const hasNonDraftStatus =
      isDefined(data.docStatus) && data.docStatus !== DOC_STATUS.DRAFT;
    const touchesPostingManagedField = POSTING_MANAGED_FIELD_NAMES.some(
      (fieldName) => isDefined(data[fieldName]),
    );

    if (hasNonDraftStatus || touchesPostingManagedField) {
      throw new CommonQueryRunnerException(
        'ERP documents can only be created as DRAFT; posting-managed fields are server-written',
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Документ можно создать только в статусе «Черновик»: статус и поля оплаты заполняются проведением.`,
        },
      );
    }
  }

  private assertNoPostingManagedFields(data: Record<string, unknown>): void {
    const touchedFieldName = ['docStatus', ...POSTING_MANAGED_FIELD_NAMES].find(
      (fieldName) => fieldName in data,
    );

    if (isDefined(touchedFieldName)) {
      throw new CommonQueryRunnerException(
        `Field "${touchedFieldName}" is managed by the posting flow`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Статус документа и поля оплаты изменяются только проведением — вручную менять их нельзя.`,
        },
      );
    }
  }

  private async assertFilteredRecordsAreDraft(
    workspaceId: string,
    objectNameSingular: string,
    filter: unknown,
  ): Promise<void> {
    const recordIds = extractRecordIdsFromFilter(filter);

    // Fail closed: a filter that is not bounded by ids cannot be checked
    // record-by-record for POSTED documents.
    if (!isDefined(recordIds)) {
      throw new CommonQueryRunnerException(
        `Bulk mutation filter on "${objectNameSingular}" is not bounded by record ids`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Массовая операция с документами возможна только по выбранным записям.`,
        },
      );
    }

    await this.assertRecordsAreDraft(workspaceId, objectNameSingular, recordIds);
  }

  private async assertRecordsAreDraft(
    workspaceId: string,
    objectNameSingular: string,
    recordIds: string[],
  ): Promise<void> {
    if (recordIds.length === 0) {
      return;
    }

    const records = await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository = await this.globalWorkspaceOrmManager.getRepository<{
          id: string;
          docStatus: string;
        }>(workspaceId, objectNameSingular, {
          shouldBypassPermissionChecks: true,
        });

        return repository.findBy({ id: In(recordIds) });
      },
      buildSystemAuthContext(workspaceId),
    );

    const nonDraftRecord = records.find(
      (record) => record.docStatus !== DOC_STATUS.DRAFT,
    );

    if (isDefined(nonDraftRecord)) {
      throw new CommonQueryRunnerException(
        `Document "${nonDraftRecord.id}" of "${objectNameSingular}" is ${nonDraftRecord.docStatus}; only DRAFT documents can be modified`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Документ проведён или отменён — изменять и удалять его нельзя. Сначала отмените проведение.`,
        },
      );
    }
  }
}
