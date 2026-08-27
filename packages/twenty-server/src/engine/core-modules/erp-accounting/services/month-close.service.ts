import { Injectable, NotFoundException } from '@nestjs/common';

import crypto from 'crypto';

import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentRecord } from 'src/engine/core-modules/erp/types/posting.types';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { firstDayOfNextMonth } from 'src/engine/core-modules/erp-accounting/utils/compute-month-close.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const MONTH_CLOSE_OBJECT_NAME = 'monthClose';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// Documents created via the CRUD path stamp the calling user; this service
// creates the DRAFT directly (bypassing GraphQL create), so it stamps its
// own actor — same convention as bank-statement-import.service.ts.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };
const MONTH_FORMAT_REGEXP = /^\d{4}-(0[1-9]|1[0-2])$/;

// success/message match the ToolOutput shape (ConfirmReconciliationResult
// convention) so both the raw MCP tool and the ErpAgentToolService bridge can
// return this value as-is, no wrapping needed.
export type MonthCloseResult = {
  success: true;
  id: string;
  number: string | null;
  name: string | null;
  docStatus: string;
  message: string;
};

// close_month MCP tool (Task 5, ruling): creates the DRAFT monthClose record
// then posts it in the same call, so the agent doesn't need two round-trips
// (create_one_monthClose + post_document) — mirrors how bank-statement
// import creates documents outside the GraphQL path.
@Injectable()
export class MonthCloseService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly postingService: PostingService,
  ) {}

  async closeMonth(
    workspaceId: string,
    organizationId: string,
    month: string,
    isYearReformation: boolean,
  ): Promise<MonthCloseResult> {
    if (!MONTH_FORMAT_REGEXP.test(month)) {
      throw new NotFoundException(
        `Некорректный формат месяца «${month}» — ожидается «YYYY-MM».`,
      );
    }

    const period = `${month}-01`;
    // Даты закрытия — последний день закрываемого месяца (research §3:
    // «заключительными оборотами месяца»), а не «сегодня» — иначе ретроактивное
    // закрытие датировало бы проводки днём вызова тула.
    const postingDate = this.lastDayOfMonth(period);

    const documentId = await this.runInWorkspaceTransaction(
      workspaceId,
      async (scope) => {
        const organization = await scope
          .getRepository<Record<string, unknown>>(
            'organization',
            BYPASS_PERMISSIONS,
          )
          .findOneBy({ id: organizationId });

        if (!isDefined(organization)) {
          throw new NotFoundException(
            `Организация «${organizationId}» не найдена.`,
          );
        }

        const documentRepository = scope.getRepository<ErpDocumentRecord>(
          MONTH_CLOSE_OBJECT_NAME,
          BYPASS_PERMISSIONS,
        );
        // .save()'s resolved value doesn't carry the server-generated id back
        // (see bank-statement-import.service.ts) — generated here instead.
        const id = crypto.randomUUID();

        await documentRepository.save({
          id,
          organizationId,
          period,
          isYearReformation,
          postingDate,
          docStatus: DOC_STATUS.DRAFT,
          createdBy: SYSTEM_ACTOR,
          updatedBy: SYSTEM_ACTOR,
        });

        return id;
      },
    );

    await this.postingService.post(
      workspaceId,
      MONTH_CLOSE_OBJECT_NAME,
      documentId,
    );

    return this.runInWorkspaceTransaction(workspaceId, async (scope) => {
      const document = await scope
        .getRepository<ErpDocumentRecord>(
          MONTH_CLOSE_OBJECT_NAME,
          BYPASS_PERMISSIONS,
        )
        .findOneByOrFail({ id: documentId });

      const number =
        typeof document.number === 'string' ? document.number : null;
      const name = typeof document.name === 'string' ? document.name : null;

      return {
        success: true,
        id: documentId,
        number,
        name,
        docStatus: String(document.docStatus),
        message: `Месяц ${month} закрыт документом ${number ?? documentId}${isYearReformation ? ' (реформация года)' : ''}.`,
      };
    });
  }

  private lastDayOfMonth(periodFirstOfMonth: string): string {
    const nextMonthFirstDay = firstDayOfNextMonth(periodFirstOfMonth);
    const lastDayDate = new Date(nextMonthFirstDay);

    lastDayDate.setUTCDate(lastDayDate.getUTCDate() - 1);

    return lastDayDate.toISOString().slice(0, 10);
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
}
