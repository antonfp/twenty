import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import crypto from 'crypto';

import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentRecord } from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import { RUB_CURRENCY_CODE } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SALES_INVOICE_LINE_OBJECT_NAME = 'salesInvoiceLine';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// Created outside the GraphQL create path (direct repository write), same
// reasoning as bank-statement-import.service.ts / month-close.service.ts —
// stamps its own actor rather than leaving createdBy/updatedBy unset.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };

export type CreateInvoiceRevisionResult = {
  success: true;
  id: string;
  number: string | null;
  revisionNumber: number;
  sourceId: string;
  linesCopied: number;
  message: string;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const asCurrency = (
  value: unknown,
): { amountMicros: number; currencyCode: string } => {
  const currency = value as CurrencyFieldValue;

  return {
    amountMicros: Number(currency?.amountMicros ?? 0),
    currencyCode: asText(currency?.currencyCode) || RUB_CURRENCY_CODE,
  };
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

// «Исправление счёта» (Task 6, ruling «Ruling (исправления/amend)»):
// исправительный документ, не УКД (research §4) — устраняет техническую
// ошибку в уже свершившемся факте, сама сделка не меняется. Копия шапки +
// ВСЕХ строк источника, amendedFrom=source, revisionNumber=source+1,
// docStatus=DRAFT, number ТОТ ЖЕ (при последующем проведении
// DocumentNumberingService видит непустой number и не генерирует новый —
// см. SalesInvoicePostingRulesService.getPartyEntries). Оригинал НЕ
// трогается: остаётся POSTED, отмена его проведения — отдельное ручное
// решение бухгалтера (см. message ниже).
@Injectable()
export class CreateInvoiceRevisionService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async createInvoiceRevision(
    workspaceId: string,
    sourceInvoiceId: string,
  ): Promise<CreateInvoiceRevisionResult> {
    return this.runInWorkspaceTransaction(workspaceId, (scope) =>
      this.applyCreateRevision(scope, sourceInvoiceId),
    );
  }

  private async applyCreateRevision(
    scope: WorkspaceTransactionScope,
    sourceInvoiceId: string,
  ): Promise<CreateInvoiceRevisionResult> {
    const invoiceRepository = scope.getRepository<ErpDocumentRecord>(
      SALES_INVOICE_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );
    const source = await invoiceRepository.findOneBy({ id: sourceInvoiceId });

    if (!isDefined(source)) {
      throw new NotFoundException(`Счёт «${sourceInvoiceId}» не найден.`);
    }

    if (source.docStatus === DOC_STATUS.DRAFT) {
      throw new BadRequestException(
        'Черновик правится напрямую — исправление создаётся только для проведённого счёта.',
      );
    }

    if (source.docStatus !== DOC_STATUS.POSTED) {
      throw new BadRequestException(
        'Счёт отменён — сначала проведите его заново, исправление недоступно для отменённого документа.',
      );
    }

    // Не withDeleted: мягко удалённый черновик-исправление — сознательно
    // отклонённый бухгалтером вариант, повторное создание должно быть
    // разрешено (тот же принцип, что и orphan-retry в month-close.service.ts).
    const existingDraftRevision = await invoiceRepository.findOne({
      where: { amendedFromId: sourceInvoiceId, docStatus: DOC_STATUS.DRAFT },
    });

    if (isDefined(existingDraftRevision)) {
      throw new BadRequestException(
        `У счёта уже есть черновик исправления № ${Number(existingDraftRevision.revisionNumber ?? 0)} — сначала проведите или удалите его.`,
      );
    }

    const lineRepository = scope.getRepository<ErpDocumentRecord>(
      SALES_INVOICE_LINE_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );
    const sourceLines = (
      await lineRepository.findBy({ salesInvoiceId: sourceInvoiceId })
    ).sort((firstLine, secondLine) => {
      return (
        Number(firstLine.position ?? 0) - Number(secondLine.position ?? 0) ||
        asText(firstLine.createdAt).localeCompare(asText(secondLine.createdAt))
      );
    });

    const newInvoiceId = crypto.randomUUID();
    const revisionNumber = Number(source.revisionNumber ?? 0) + 1;
    const invoiceNumber = isDefined(source.number)
      ? asText(source.number)
      : null;

    await invoiceRepository.save({
      id: newInvoiceId,
      name: `Исправление № ${revisionNumber} к счёту № ${invoiceNumber ?? source.id}`,
      number: invoiceNumber,
      invoiceDate: todayIso(),
      docStatus: DOC_STATUS.DRAFT,
      organizationId: source.organizationId ?? null,
      customerId: source.customerId ?? null,
      comment: source.comment ?? null,
      amendedFromId: source.id,
      revisionNumber,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    // Копируются ВСЕХ строк источника, чисто (композиты CURRENCY —
    // {amountMicros, currencyCode} собираются заново через asCurrency,
    // а не расползающийся spread всей строки) — БЕЗ id/createdAt/updatedAt/
    // deletedAt/__typename исходной строки (уроки прошлых фаз: копия обязана
    // получить свежий id и свежий createdAt, иначе конфликт первичного ключа
    // / ложный порядок). Последовательно (await в цикле), чтобы createdAt
    // возрастал в исходном порядке строк — тот же tie-break, что и
    // SalesInvoicePrintService использует при печати.
    for (const line of sourceLines) {
      await lineRepository.save({
        id: crypto.randomUUID(),
        salesInvoiceId: newInvoiceId,
        name: asText(line.name),
        itemId: typeof line.itemId === 'string' ? line.itemId : null,
        quantity: line.quantity ?? null,
        price: asCurrency(line.price),
        vatRate: line.vatRate ?? null,
        amount: asCurrency(line.amount),
        position: line.position ?? 0,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      });
    }

    return {
      success: true,
      id: newInvoiceId,
      number: invoiceNumber,
      revisionNumber,
      sourceId: source.id,
      linesCopied: sourceLines.length,
      message:
        `Исправление создано: черновик № ${invoiceNumber ?? newInvoiceId} (исправление ${revisionNumber}), строк скопировано: ${sourceLines.length}. ` +
        'Оригинал остаётся проведённым — отмените его проведение, когда исправление готово.',
    };
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
