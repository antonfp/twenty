import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { In, IsNull } from 'typeorm';
import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentRecord } from 'src/engine/core-modules/erp/types/posting.types';
import {
  type CurrencyFieldValue,
  PAYMENT_STATUS,
} from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import { currencyToKopecks } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import {
  innsMatch,
  scoreReconciliationCandidate,
} from 'src/engine/core-modules/erp-accounting/utils/compute-reconciliation-score.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
const COMPANY_OBJECT_NAME = 'company';

// Sales (payment -> salesInvoice, incoming) and purchases (supplierPayment ->
// supplierInvoice, outgoing) share the exact same field shape one level up
// (payment.object.ts / supplier-payment.object.ts are a mirror — see
// task-3-report.md), so one table-driven loop covers both instead of
// duplicating the whole scan twice.
type ReconciliationSide = {
  paymentType: 'payment' | 'supplierPayment';
  paymentObjectName: string;
  invoiceObjectName: string;
  paymentCounterpartyField: string;
  invoiceCounterpartyField: string;
  invoiceLinkField: string;
};

const RECONCILIATION_SIDES: readonly ReconciliationSide[] = [
  {
    paymentType: 'payment',
    paymentObjectName: 'payment',
    invoiceObjectName: 'salesInvoice',
    paymentCounterpartyField: 'payerId',
    invoiceCounterpartyField: 'customerId',
    invoiceLinkField: 'salesInvoiceId',
  },
  {
    paymentType: 'supplierPayment',
    paymentObjectName: 'supplierPayment',
    invoiceObjectName: 'supplierInvoice',
    paymentCounterpartyField: 'supplierId',
    invoiceCounterpartyField: 'supplierId',
    invoiceLinkField: 'supplierInvoiceId',
  },
];

export type ReconciliationCandidate = {
  invoiceId: string;
  invoiceNumber: string | null;
  invoiceTotalKopecks: number;
  remainingKopecks: number;
  score: number;
  explanation: string;
};

export type ReconciliationProposal = {
  paymentType: 'payment' | 'supplierPayment';
  paymentId: string;
  paymentNumber: string | null;
  paymentAmountKopecks: number;
  paymentComment: string | null;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyInn: string | null;
  candidates: ReconciliationCandidate[];
};

export type ConfirmReconciliationResult = {
  success: true;
  alreadyLinked: boolean;
  message: string;
};

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

// Банковская сверка (Task 3, ruling): предложения для непривязанных
// (invoiceId null) DRAFT-платежей организации, скоринг — см.
// compute-reconciliation-score.util.ts; подтверждение — прямое проставление
// связи (без проведения, оно остаётся ручным/агентским шагом).
//
// «Остаток к оплате» = invoice.total − invoice.paidAmount, а НЕ пересчёт по
// регистру partyLedgerEntry. Ruling требует считать «по существующим
// связям, не по регистру» — invoice.paidAmount уже ЕСТЬ эта сумма: она
// поддерживается атомарно внутри PaymentPostingRulesService/
// SupplierPaymentPostingRulesService при каждом проведении/отмене оплаты
// (paidAmount += amount на проведении, −= amount на отмене) и недоступна для
// прямой правки клиентом (ErpDocumentGuardService.POSTING_MANAGED_FIELD_NAMES).
// Читать её напрямую — то же самое число, что пересчёт по связям, без
// обращения к регистру и без дублирования уже проверенной арифметики.
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getReconciliationProposals(
    workspaceId: string,
    organizationId: string,
  ): Promise<ReconciliationProposal[]> {
    return this.runInWorkspaceTransaction(workspaceId, (scope) =>
      this.buildProposals(scope, organizationId),
    );
  }

  async confirmReconciliation(
    workspaceId: string,
    paymentId: string,
    invoiceId: string,
  ): Promise<ConfirmReconciliationResult> {
    return this.runInWorkspaceTransaction(workspaceId, (scope) =>
      this.applyConfirmation(scope, paymentId, invoiceId),
    );
  }

  private async buildProposals(
    scope: WorkspaceTransactionScope,
    organizationId: string,
  ): Promise<ReconciliationProposal[]> {
    const proposals: ReconciliationProposal[] = [];

    for (const side of RECONCILIATION_SIDES) {
      const paymentRepository = scope.getRepository<ErpDocumentRecord>(
        side.paymentObjectName,
        BYPASS_PERMISSIONS,
      );

      const unlinkedPayments = await paymentRepository.findBy({
        organizationId,
        docStatus: DOC_STATUS.DRAFT,
        [side.invoiceLinkField]: IsNull(),
      });

      if (unlinkedPayments.length === 0) {
        continue;
      }

      const invoiceRepository = scope.getRepository<ErpDocumentRecord>(
        side.invoiceObjectName,
        BYPASS_PERMISSIONS,
      );
      const openInvoices = await invoiceRepository.findBy({
        organizationId,
        docStatus: DOC_STATUS.POSTED,
        paymentStatus: In([
          PAYMENT_STATUS.UNPAID,
          PAYMENT_STATUS.PARTIALLY_PAID,
        ]),
      });

      const companyById = await this.loadCompaniesByIds(scope, [
        ...unlinkedPayments.map((p) => p[side.paymentCounterpartyField]),
        ...openInvoices.map((inv) => inv[side.invoiceCounterpartyField]),
      ]);

      for (const payment of unlinkedPayments) {
        proposals.push(
          this.buildProposal(side, payment, openInvoices, companyById),
        );
      }
    }

    return proposals;
  }

  private buildProposal(
    side: ReconciliationSide,
    payment: ErpDocumentRecord,
    openInvoices: ErpDocumentRecord[],
    companyById: Map<string, ErpDocumentRecord>,
  ): ReconciliationProposal {
    const counterpartyId = asString(payment[side.paymentCounterpartyField]);
    const counterparty = isDefined(counterpartyId)
      ? companyById.get(counterpartyId)
      : undefined;
    const paymentInn = asString(counterparty?.inn);
    const paymentAmountKopecks = currencyToKopecks(
      payment.amount as CurrencyFieldValue,
    );
    const paymentComment = asString(payment.comment);

    const candidates: ReconciliationCandidate[] = [];

    if (isNonEmptyString(paymentInn)) {
      for (const invoice of openInvoices) {
        const invoiceCounterpartyId = asString(
          invoice[side.invoiceCounterpartyField],
        );
        const invoiceCounterparty = isDefined(invoiceCounterpartyId)
          ? companyById.get(invoiceCounterpartyId)
          : undefined;
        const invoiceInn = asString(invoiceCounterparty?.inn);

        if (!innsMatch(paymentInn, invoiceInn)) {
          continue;
        }

        const totalKopecks = currencyToKopecks(
          invoice.total as CurrencyFieldValue,
        );
        const paidKopecks = currencyToKopecks(
          invoice.paidAmount as CurrencyFieldValue,
        );
        const remainingKopecks = totalKopecks - paidKopecks;

        // paymentStatus already excludes PAID (query filter above), but a
        // stale/inconsistent row (remaining <= 0 despite PARTIALLY_PAID) must
        // not surface as a candidate either — "оплаченный счёт не кандидат".
        if (remainingKopecks <= 0) {
          continue;
        }

        const invoiceNumber = asString(invoice.number);
        const scored = scoreReconciliationCandidate({
          paymentAmountKopecks,
          remainingKopecks,
          paymentComment,
          invoiceNumber,
        });

        if (!isDefined(scored)) {
          continue;
        }

        candidates.push({
          invoiceId: invoice.id,
          invoiceNumber,
          invoiceTotalKopecks: totalKopecks,
          remainingKopecks,
          score: scored.score,
          explanation: scored.explanation,
        });
      }
    }

    candidates.sort(
      (a, b) => b.score - a.score || a.remainingKopecks - b.remainingKopecks,
    );

    return {
      paymentType: side.paymentType,
      paymentId: payment.id,
      paymentNumber: asString(payment.number),
      paymentAmountKopecks,
      paymentComment,
      counterpartyId: counterpartyId ?? null,
      counterpartyName: asString(counterparty?.name),
      counterpartyInn: paymentInn,
      candidates,
    };
  }

  private async applyConfirmation(
    scope: WorkspaceTransactionScope,
    paymentId: string,
    invoiceId: string,
  ): Promise<ConfirmReconciliationResult> {
    const found = await this.findPaymentSide(scope, paymentId);

    if (!isDefined(found)) {
      throw new NotFoundException('Платёж не найден.');
    }

    const { side, payment } = found;
    const currentLinkId = asString(payment[side.invoiceLinkField]);

    // Идемпотентность (ruling): повторный confirm той же пары — ок; смена
    // привязки уже привязанного платежа на другой счёт — отказ. Проверяется
    // ДО загрузки целевого счёта: смена привязки отклоняется независимо от
    // того, существует ли новый invoiceId вообще.
    if (isDefined(currentLinkId)) {
      if (currentLinkId === invoiceId) {
        return {
          success: true,
          alreadyLinked: true,
          message: 'Платёж уже привязан к этому счёту.',
        };
      }

      throw new BadRequestException('Платёж уже привязан — отвяжите вручную.');
    }

    const invoiceRepository = scope.getRepository<ErpDocumentRecord>(
      side.invoiceObjectName,
      BYPASS_PERMISSIONS,
    );
    const invoice = await invoiceRepository.findOneBy({ id: invoiceId });

    if (!isDefined(invoice)) {
      throw new NotFoundException('Счёт не найден.');
    }

    if (payment.organizationId !== invoice.organizationId) {
      throw new BadRequestException(
        'Платёж и счёт принадлежат разным организациям.',
      );
    }

    const companyRepository = scope.getRepository<ErpDocumentRecord>(
      COMPANY_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );
    const paymentCounterpartyId = asString(
      payment[side.paymentCounterpartyField],
    );
    const invoiceCounterpartyId = asString(
      invoice[side.invoiceCounterpartyField],
    );
    const [paymentCounterparty, invoiceCounterparty] = await Promise.all([
      isDefined(paymentCounterpartyId)
        ? companyRepository.findOneBy({ id: paymentCounterpartyId })
        : Promise.resolve(null),
      isDefined(invoiceCounterpartyId)
        ? companyRepository.findOneBy({ id: invoiceCounterpartyId })
        : Promise.resolve(null),
    ]);

    if (
      !innsMatch(
        asString(paymentCounterparty?.inn),
        asString(invoiceCounterparty?.inn),
      )
    ) {
      throw new BadRequestException(
        'Контрагент платежа не совпадает со счётом по ИНН — привязка невозможна.',
      );
    }

    const paymentRepository = scope.getRepository<ErpDocumentRecord>(
      side.paymentObjectName,
      BYPASS_PERMISSIONS,
    );

    await paymentRepository.update(paymentId, {
      [side.invoiceLinkField]: invoiceId,
    });

    return {
      success: true,
      alreadyLinked: false,
      message: `Платёж привязан к счёту № ${asString(invoice.number) ?? invoice.id}.`,
    };
  }

  private async findPaymentSide(
    scope: WorkspaceTransactionScope,
    paymentId: string,
  ): Promise<{ side: ReconciliationSide; payment: ErpDocumentRecord } | null> {
    for (const side of RECONCILIATION_SIDES) {
      const repository = scope.getRepository<ErpDocumentRecord>(
        side.paymentObjectName,
        BYPASS_PERMISSIONS,
      );
      const payment = await repository.findOneBy({ id: paymentId });

      if (isDefined(payment)) {
        return { side, payment };
      }
    }

    return null;
  }

  // ponytail: N distinct-id lookups via one `id IN (...)`, filtered/deduped
  // in JS — same shape as bank-statement-import.service.ts's ponytail note;
  // fine at SMB reconciliation volumes (a handful of open documents).
  private async loadCompaniesByIds(
    scope: WorkspaceTransactionScope,
    rawIds: unknown[],
  ): Promise<Map<string, ErpDocumentRecord>> {
    const ids = [
      ...new Set(rawIds.filter((id): id is string => isNonEmptyString(id))),
    ];

    if (ids.length === 0) {
      return new Map();
    }

    const companies = await scope
      .getRepository<ErpDocumentRecord>(COMPANY_OBJECT_NAME, BYPASS_PERMISSIONS)
      .findBy({ id: In(ids) });

    return new Map(companies.map((company) => [company.id, company]));
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
