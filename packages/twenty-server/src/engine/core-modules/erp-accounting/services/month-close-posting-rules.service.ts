import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { lastDayOfMonth } from 'src/engine/core-modules/erp-accounting/utils/compute-month-close.util';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PartyLedgerEntryInput,
  type PostingContext,
  type PostingRulesProvider,
} from 'src/engine/core-modules/erp/types/posting.types';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const MONTH_CLOSE_OBJECT_NAME = 'monthClose';
const MONTH_CLOSE_NUMBER_PREFIX = 'MC';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
const DECEMBER = '12';

const isFirstOfMonthDateOnly = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length >= 10 &&
  value.slice(8, 10) === '01';

// Закрытие месяца: провайдер только валидирует шапку документа (период,
// повторное закрытие, реформация только за декабрь) и нумерует его —
// суммы/проводки считает и пишет GL-контрибьютор monthCloseGlEntries
// (gl-contributors.service.ts), включая отказ «Нет оборотов за месяц» (он
// зависит от оборотов glEntry, которые естественно считаются там же, где
// строятся проводки — см. комментарий там). Регистров взаиморасчётов/склада
// у документа нет.
@Injectable()
export class MonthClosePostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
  ) {}

  async validate(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<void> {
    const organizationId = document.organizationId;

    if (typeof organizationId !== 'string') {
      throw new ErpPostingException(
        `Month close "${document.id}" has no organization`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        { userFriendlyMessage: msg`Не указана организация.` },
      );
    }

    const period = document.period;

    if (!isFirstOfMonthDateOnly(period)) {
      throw new ErpPostingException(
        `Month close "${document.id}" has no valid period`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Период должен быть первым числом закрываемого месяца.`,
        },
      );
    }

    // Review Minor #3 (phase-9 final): a UI-created monthClose (unlike the
    // MCP close_month path, which always sets postingDate to lastDayOfMonth
    // itself) can reach posting with postingDate still null — PostingService
    // .resolvePostingDate then falls back to "now", so closing a past month
    // days/weeks late would date the 90.09/91.09→99 GL entries with today
    // instead of the closed period. Mutating context.postingDate here (not
    // just the local `period` var) is what actually fixes it — everything
    // downstream (getPartyEntries' document name, the GL contributor, and
    // PostingService's own postingDate backfill) reads context.postingDate,
    // not document.postingDate, from this point on. Only defaults when the
    // document itself never had one — an explicit postingDate is never
    // overridden.
    // ponytail: PostingService's period-lock check already ran (against
    // "now") before this validate() call, so this default can't make a
    // backdated close respect a lockDate set between the period and today —
    // that needs postingDate resolved before the lock check, i.e. in
    // PostingService itself. Same trivial-pass gap existed before this fix
    // (the lock check was already checking "now", not the period), just
    // less visible; revisit if lockDate + backdated monthClose collide in
    // practice.
    if (!isDefined(document.postingDate)) {
      context.postingDate = lastDayOfMonth(period);
    }

    // 'YYYY-MM' string compare — same "no Date branch" reasoning as
    // period-lock.service.ts: DATE columns hydrate as plain strings, and
    // lexicographic compare on a zero-padded calendar string is exact.
    const currentYearMonth = new Date().toISOString().slice(0, 7);

    if (period.slice(0, 7) > currentYearMonth) {
      throw new ErpPostingException(
        `Month close "${document.id}" period ${period} is in the future`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        { userFriendlyMessage: msg`Нельзя закрыть будущий месяц.` },
      );
    }

    const isYearReformation = document.isYearReformation === true;

    if (isYearReformation && period.slice(5, 7) !== DECEMBER) {
      throw new ErpPostingException(
        `Month close "${document.id}" requests reformation for a non-December period ${period}`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Реформацию года можно провести только за декабрь.`,
        },
      );
    }

    // withDeleted — a soft-deleted POSTED monthClose is invisible to a plain
    // lookup and would wrongly let the same month close a second time (see
    // sales-invoice-posting-rules.service.ts for the same lesson).
    const alreadyClosed = await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        MONTH_CLOSE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .findOne({
        where: { organizationId, period, docStatus: DOC_STATUS.POSTED },
        withDeleted: true,
      });

    if (isDefined(alreadyClosed)) {
      const existingNumber = isNonEmptyString(alreadyClosed.number)
        ? alreadyClosed.number
        : String(alreadyClosed.id);

      throw new ErpPostingException(
        `Month close for organization "${organizationId}" period ${period} already exists (${existingNumber}, id "${alreadyClosed.id}")`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Месяц уже закрыт документом ${existingNumber}.`,
        },
      );
    }
  }

  // Side effects (numbering, document name) live here — same convention as
  // manual-entry-posting-rules.service.ts — no register rows of its own.
  async getPartyEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<PartyLedgerEntryInput[]> {
    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: MONTH_CLOSE_OBJECT_NAME,
          prefix: MONTH_CLOSE_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const reformationSuffix =
      document.isYearReformation === true ? ' (реформация года)' : '';
    const documentName = `Закрытие месяца № ${documentNumber} от ${formatDateRuShort(context.postingDate)}${reformationSuffix}`;

    await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        MONTH_CLOSE_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .update(document.id, {
        number: documentNumber,
        name: documentName,
      });

    return [];
  }
}
