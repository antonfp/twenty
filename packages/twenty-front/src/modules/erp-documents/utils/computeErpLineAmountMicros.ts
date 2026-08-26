// Mirrors erp-sales-money.util.ts (currencyToKopecks / computeLineAmountKopecks
// / kopecksToCurrency) on the server: integer kopeck math, half-away-from-zero
// rounding (Math.round matches 1С for the non-negative amounts documents use).
// This is a client-side UX hint only — computeInvoiceTotals/
// inflow-document-posting-rules on the server always recompute the real
// total from quantity×price at posting time, so any divergence here is
// harmless before Post.
const MICROS_PER_KOPECK = 10_000;

export const computeErpLineAmountMicros = (
  quantity: number,
  priceAmountMicros: number,
): number => {
  const priceKopecks = Math.round(priceAmountMicros / MICROS_PER_KOPECK);
  const amountKopecks = Math.round(quantity * priceKopecks);

  return amountKopecks * MICROS_PER_KOPECK;
};
