import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { getWorkspaceContext } from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';

const ORGANIZATION_OBJECT_NAME = 'organization';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

export type AssertPeriodOpenArgs = {
  // Raw document field — validated here so every document (incl. manualEntry)
  // passes it through without pre-checks.
  organizationId: unknown;
  postingDate: string;
  transactionScope: WorkspaceTransactionScope;
};

// DATE columns hydrate as 'YYYY-MM-DD' strings; postingDate may be a full
// ISO timestamp — compare calendar days only. No Date branch on purpose: a
// UTC normalization of a locally-parsed Date would shift the day and weaken
// the guard (fail-open), and no current path delivers a Date here.
const toDateOnly = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length >= 10) {
    return value.slice(0, 10);
  }

  return null;
};

const formatDateOnlyRu = (dateOnly: string): string =>
  `${dateOnly.slice(8, 10)}.${dateOnly.slice(5, 7)}.${dateOnly.slice(0, 4)}`;

// Ruling (lock date): organization.lockDate закрывает период — post И cancel
// документа с postingDate ≤ lockDate отклоняются (граница включительно).
// Проверка тихо пропускается без organizationId документа, без установленного
// erp-base или без заданной lockDate.
@Injectable()
export class PeriodLockService {
  async assertPeriodOpen({
    organizationId,
    postingDate,
    transactionScope,
  }: AssertPeriodOpenArgs): Promise<void> {
    if (typeof organizationId !== 'string') {
      return;
    }

    const { objectIdByNameSingular } = getWorkspaceContext();

    if (!isDefined(objectIdByNameSingular[ORGANIZATION_OBJECT_NAME])) {
      return;
    }

    const organization = await transactionScope
      .getRepository<Record<string, unknown>>(
        ORGANIZATION_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOneBy({ id: organizationId });

    if (!isDefined(organization)) {
      return;
    }

    const lockDay = toDateOnly(organization.lockDate);
    const postingDay = toDateOnly(postingDate);

    if (lockDay === null || postingDay === null) {
      return;
    }

    if (postingDay <= lockDay) {
      const organizationName =
        typeof organization.name === 'string' ? organization.name : '';
      // Ruling: {дата} в сообщении — «Дата запрета изменений» организации
      // (граница закрытого периода), не дата документа.
      const lockDayRu = formatDateOnlyRu(lockDay);

      throw new ErpPostingException(
        `Period is locked for organization "${organizationId}": posting date ${postingDay} is on or before lock date ${lockDay}`,
        ERP_POSTING_EXCEPTION_CODE.PERIOD_LOCKED,
        {
          userFriendlyMessage: msg`Период закрыт: изменения по ${lockDayRu} запрещены (организация „${organizationName}“)`,
        },
      );
    }
  }
}
