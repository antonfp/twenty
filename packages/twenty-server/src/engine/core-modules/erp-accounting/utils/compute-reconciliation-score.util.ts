// Банковская сверка (Task 3, Фаза 9) — pure scoring layer, same split as
// compute-account-card.util.ts/compute-trial-balance.util.ts: no DB access
// here, so the scoring matrix is directly unit-testable.
import { isNonEmptyString } from '@sniptt/guards';

import { kopecksToRubles } from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';

// Веса ruling'а (docs/plans/phase9-accounting-depth.md, «Ruling (сверка)»):
// точная сумма — высший вес, частичная (≤ остатка) — ниже; назначение
// платежа, содержащее номер счёта, добавляет вес. Итог для "точная сумма +
// номер в назначении" = 2 + 1 = 3, как в task-3-brief.md.
export const RECONCILIATION_SCORE = {
  AMOUNT_EXACT: 2,
  AMOUNT_PARTIAL: 1,
  COMMENT_HAS_INVOICE_NUMBER: 1,
} as const;

// ИНН — обязательный фильтр (ruling): без совпадения ИНН счёт вообще не
// кандидат, это не влияет на скор.
export const innsMatch = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean =>
  isNonEmptyString(a) && isNonEmptyString(b) && a.trim() === b.trim();

export type ReconciliationAmountMatch = 'EXACT' | 'PARTIAL';

export type ReconciliationCandidateScore = {
  score: number;
  amountMatch: ReconciliationAmountMatch;
  commentMentionsInvoiceNumber: boolean;
  explanation: string;
};

// null — счёт не кандидат по сумме (платёж больше остатка к оплате). Вызывать
// только для счетов, уже прошедших фильтры ИНН/POSTED/остаток>0 — эта
// функция сама их не проверяет (см. ReconciliationService).
export const scoreReconciliationCandidate = ({
  paymentAmountKopecks,
  remainingKopecks,
  paymentComment,
  invoiceNumber,
}: {
  paymentAmountKopecks: number;
  remainingKopecks: number;
  paymentComment: string | null;
  invoiceNumber: string | null;
}): ReconciliationCandidateScore | null => {
  if (paymentAmountKopecks > remainingKopecks) {
    return null;
  }

  const amountMatch: ReconciliationAmountMatch =
    paymentAmountKopecks === remainingKopecks ? 'EXACT' : 'PARTIAL';
  const commentMentionsInvoiceNumber =
    isNonEmptyString(paymentComment) &&
    isNonEmptyString(invoiceNumber) &&
    paymentComment.toLowerCase().includes(invoiceNumber.toLowerCase());

  const score =
    (amountMatch === 'EXACT'
      ? RECONCILIATION_SCORE.AMOUNT_EXACT
      : RECONCILIATION_SCORE.AMOUNT_PARTIAL) +
    (commentMentionsInvoiceNumber
      ? RECONCILIATION_SCORE.COMMENT_HAS_INVOICE_NUMBER
      : 0);

  const explanationParts = [
    amountMatch === 'EXACT'
      ? `сумма платежа (${kopecksToRubles(paymentAmountKopecks)} ₽) точно совпадает с остатком к оплате`
      : `сумма платежа (${kopecksToRubles(paymentAmountKopecks)} ₽) не превышает остаток к оплате (${kopecksToRubles(remainingKopecks)} ₽)`,
  ];

  if (commentMentionsInvoiceNumber) {
    explanationParts.push(
      `номер счёта № ${invoiceNumber} упомянут в назначении платежа`,
    );
  }

  return {
    score,
    amountMatch,
    commentMentionsInvoiceNumber,
    explanation: `ИНН контрагента совпадает; ${explanationParts.join('; ')}.`,
  };
};
