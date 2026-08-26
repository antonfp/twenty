// Скользящая средняя себестоимость. All monetary math is integer: values in
// kopecks, avgCost in micros per unit (1 kopeck = 10_000 micros) so repeated
// receipts don't accumulate sub-kopeck drift. Quantities are floats (NUMBER
// fields), compared with an epsilon.

export const MICROS_PER_KOPECK = 10_000;

// Item quantities are user-entered with up to a few decimals; 1e-9 absorbs
// float noise like 0.1 + 0.2 without masking real shortages.
export const QTY_EPSILON = 1e-9;

export type ItemBalanceMeasures = {
  actualQty: number;
  avgCostMicros: number;
};

// Math.round rounds -0.5 toward +Infinity; financial rounding here must be
// half away from zero for either sign.
export const roundHalfAwayFromZero = (value: number): number => {
  return Math.sign(value) * Math.round(Math.abs(value));
};

export const normalizeQty = (quantity: number): number => {
  return Math.abs(quantity) < QTY_EPSILON ? 0 : quantity;
};

export const microsToCurrency = (
  amountMicros: number,
  currencyCode: string,
): { amountMicros: number; currencyCode: string } => {
  return { amountMicros, currencyCode };
};

// Receipt AND cancellation rollback share one formula: apply a signed
// (quantity, value) delta and recompute the average from the new totals.
// newAvg = (oldQty×oldAvg + valueDelta) / newQty, rounded to whole micros,
// clamped at zero. When the quantity lands on zero any residual value is
// discarded with it (the average is kept as informational) — inherent to
// moving average without reprocessing history. The caller validates that
// newQty is not negative BEFORE applying.
export const applyDeltaToMeasures = (
  measures: ItemBalanceMeasures,
  quantityDelta: number,
  valueDeltaKopecks: number,
): ItemBalanceMeasures => {
  const actualQty = normalizeQty(measures.actualQty + quantityDelta);

  if (actualQty <= 0) {
    return { actualQty, avgCostMicros: measures.avgCostMicros };
  }

  const totalValueMicros =
    measures.actualQty * measures.avgCostMicros +
    valueDeltaKopecks * MICROS_PER_KOPECK;

  return {
    actualQty,
    avgCostMicros: Math.max(
      roundHalfAwayFromZero(totalValueMicros / actualQty),
      0,
    ),
  };
};

// Issue: cost = qty×avg rounded half away from zero to kopecks; the average
// itself never changes on issue (classic moving average).
export const applyIssueToMeasures = (
  measures: ItemBalanceMeasures,
  quantity: number,
): { measures: ItemBalanceMeasures; costKopecks: number } => {
  const costKopecks = roundHalfAwayFromZero(
    (quantity * measures.avgCostMicros) / MICROS_PER_KOPECK,
  );

  return {
    measures: {
      actualQty: normalizeQty(measures.actualQty - quantity),
      avgCostMicros: measures.avgCostMicros,
    },
    costKopecks,
  };
};
