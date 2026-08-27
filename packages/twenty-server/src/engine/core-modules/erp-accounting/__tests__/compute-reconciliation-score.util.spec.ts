import {
  innsMatch,
  RECONCILIATION_SCORE,
  scoreReconciliationCandidate,
} from 'src/engine/core-modules/erp-accounting/utils/compute-reconciliation-score.util';

describe('scoreReconciliationCandidate', () => {
  it('scores exact amount + invoice number in comment as the top of the matrix (2 + 1 = 3)', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 150_000,
      remainingKopecks: 150_000,
      paymentComment: 'Оплата по счёту № SI-000042 от 20.08.2026',
      invoiceNumber: 'SI-000042',
    });

    expect(result).not.toBeNull();
    expect(result?.amountMatch).toBe('EXACT');
    expect(result?.commentMentionsInvoiceNumber).toBe(true);
    expect(result?.score).toBe(
      RECONCILIATION_SCORE.AMOUNT_EXACT +
        RECONCILIATION_SCORE.COMMENT_HAS_INVOICE_NUMBER,
    );
    expect(result?.score).toBe(3);
  });

  it('scores exact amount without the invoice number mentioned as AMOUNT_EXACT only', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 150_000,
      remainingKopecks: 150_000,
      paymentComment: 'Оплата по договору поставки',
      invoiceNumber: 'SI-000042',
    });

    expect(result?.amountMatch).toBe('EXACT');
    expect(result?.commentMentionsInvoiceNumber).toBe(false);
    expect(result?.score).toBe(RECONCILIATION_SCORE.AMOUNT_EXACT);
  });

  it('scores a partial amount (≤ remaining) lower than an exact match', () => {
    const partial = scoreReconciliationCandidate({
      paymentAmountKopecks: 90_000,
      remainingKopecks: 150_000,
      paymentComment: null,
      invoiceNumber: 'SI-000042',
    });

    expect(partial?.amountMatch).toBe('PARTIAL');
    expect(partial?.score).toBe(RECONCILIATION_SCORE.AMOUNT_PARTIAL);
    expect(partial?.score).toBeLessThan(RECONCILIATION_SCORE.AMOUNT_EXACT);
  });

  it('adds the comment weight to a partial-amount match too', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 90_000,
      remainingKopecks: 150_000,
      paymentComment: 'Частичная оплата счёта № SI-000042',
      invoiceNumber: 'SI-000042',
    });

    expect(result?.score).toBe(
      RECONCILIATION_SCORE.AMOUNT_PARTIAL +
        RECONCILIATION_SCORE.COMMENT_HAS_INVOICE_NUMBER,
    );
  });

  it('disqualifies a candidate when the payment amount exceeds the remaining balance', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 200_000,
      remainingKopecks: 150_000,
      paymentComment: 'Оплата № SI-000042',
      invoiceNumber: 'SI-000042',
    });

    expect(result).toBeNull();
  });

  it('is case-insensitive when matching the invoice number in the comment', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 150_000,
      remainingKopecks: 150_000,
      paymentComment: 'оплата по счёту № si-000042',
      invoiceNumber: 'SI-000042',
    });

    expect(result?.commentMentionsInvoiceNumber).toBe(true);
  });

  // T10 parked minor (T3 review): the explanation used to interpolate a raw
  // kopecksToRubles() number (dot decimal, no thousands separator) — every
  // other RU money string in the codebase uses formatMoneyRu's comma/НБП
  // format.
  it('formats amounts in the explanation with a comma decimal and thousands separator, like the rest of the app', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 1_500_000,
      remainingKopecks: 1_500_000,
      paymentComment: null,
      invoiceNumber: null,
    });

    expect(result?.explanation).toContain('15 000,00 ₽');
    expect(result?.explanation).not.toContain('15000 ₽');

    const partial = scoreReconciliationCandidate({
      paymentAmountKopecks: 90_000,
      remainingKopecks: 1_500_000,
      paymentComment: null,
      invoiceNumber: null,
    });

    expect(partial?.explanation).toContain('900,00 ₽');
    expect(partial?.explanation).toContain('15 000,00 ₽');
  });

  it('does not crash on a null comment/invoice number and simply scores no comment bonus', () => {
    const result = scoreReconciliationCandidate({
      paymentAmountKopecks: 150_000,
      remainingKopecks: 150_000,
      paymentComment: null,
      invoiceNumber: null,
    });

    expect(result?.commentMentionsInvoiceNumber).toBe(false);
    expect(result?.score).toBe(RECONCILIATION_SCORE.AMOUNT_EXACT);
  });
});

describe('innsMatch', () => {
  it('matches equal non-empty ИНН', () => {
    expect(innsMatch('7712345678', '7712345678')).toBe(true);
  });

  it('rejects a foreign/different ИНН', () => {
    expect(innsMatch('7712345678', '7799999999')).toBe(false);
  });

  it('rejects when either side has no ИНН', () => {
    expect(innsMatch(null, '7712345678')).toBe(false);
    expect(innsMatch('7712345678', undefined)).toBe(false);
    expect(innsMatch('', '')).toBe(false);
  });
});
