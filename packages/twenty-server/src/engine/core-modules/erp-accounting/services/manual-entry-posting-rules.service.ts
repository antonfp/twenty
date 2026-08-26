import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PartyLedgerEntryInput,
  type PostingContext,
  type PostingRulesProvider,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import { currencyToKopecks } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const MANUAL_ENTRY_OBJECT_NAME = 'manualEntry';
const MANUAL_ENTRY_NUMBER_PREFIX = 'ME';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;

// Ручная операция: провайдер только валидирует строки и нумерует документ —
// сами проводки пишет GL-контрибьютор manualEntry (glue-слой), регистров
// взаиморасчётов и склада у документа нет.
@Injectable()
export class ManualEntryPostingRulesService implements PostingRulesProvider {
  constructor(
    private readonly documentNumberingService: DocumentNumberingService,
  ) {}

  validate(
    _context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ): void {
    if (lines.length === 0) {
      throw new ErpPostingException(
        `Manual entry "${document.id}" has no lines`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Ручную операцию нельзя провести без строк: добавьте хотя бы одну проводку.`,
        },
      );
    }

    for (const line of lines) {
      const amountKopecks = currencyToKopecks(
        line.amount as CurrencyFieldValue,
      );

      if (!(amountKopecks > 0)) {
        throw new ErpPostingException(
          `Manual entry line "${line.id}" has non-positive amount`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Сумма в каждой строке ручной операции должна быть больше нуля.`,
          },
        );
      }

      const debitAccountId = line.debitAccountId;
      const creditAccountId = line.creditAccountId;

      if (
        typeof debitAccountId !== 'string' ||
        typeof creditAccountId !== 'string'
      ) {
        throw new ErpPostingException(
          `Manual entry line "${line.id}" is missing a debit or credit account`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`В каждой строке ручной операции должны быть заданы счёт дебета и счёт кредита.`,
          },
        );
      }

      if (debitAccountId === creditAccountId) {
        throw new ErpPostingException(
          `Manual entry line "${line.id}" debits and credits the same account`,
          ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
          {
            userFriendlyMessage: msg`Счёт дебета и счёт кредита в строке ручной операции должны различаться.`,
          },
        );
      }
    }
  }

  // Side effects (numbering, document name) live here because the posting
  // contract has no dedicated apply hook — same convention as the block
  // providers; no register rows of its own.
  async getPartyEntries(
    context: PostingContext,
    document: ErpDocumentRecord,
    _lines: ErpDocumentLineRecord[],
  ): Promise<PartyLedgerEntryInput[]> {
    const documentNumber = isNonEmptyString(document.number)
      ? document.number
      : await this.documentNumberingService.nextDocumentNumber({
          workspaceId: context.workspaceId,
          docType: MANUAL_ENTRY_OBJECT_NAME,
          prefix: MANUAL_ENTRY_NUMBER_PREFIX,
          executeRawQuery: context.transactionScope.executeRawQuery,
        });

    const documentName = `Ручная операция № ${documentNumber} от ${formatDateRuShort(context.postingDate)}`;

    await context.transactionScope
      .getRepository<ErpDocumentRecord>(
        MANUAL_ENTRY_OBJECT_NAME,
        BYPASS_PERMISSIONS,
      )
      .update(document.id, {
        number: documentNumber,
        name: documentName,
      });

    return [];
  }
}
