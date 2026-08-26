import { computeErpLineAmountMicros } from '@/erp-documents/utils/computeErpLineAmountMicros';

describe('computeErpLineAmountMicros', () => {
  it('multiplies quantity by price with no rounding needed', () => {
    // 4 × 125.00 ₽ = 500.00 ₽
    expect(computeErpLineAmountMicros(4, 125_000_000)).toBe(500_000_000);
  });

  it('rounds a half-kopeck price half away from zero before multiplying', () => {
    // price = 333.45 ₽ → 3334.5 kopecks, half-away-from-zero → 3335 kopecks
    // 2.5 × 3335 kopecks = 8337.5 kopecks, half-away-from-zero → 8338 kopecks
    expect(computeErpLineAmountMicros(2.5, 33_345_000)).toBe(83_380_000);
  });

  it('rounds a half-kopeck line total half away from zero', () => {
    // price = 10.10 ₽ = 101 kopecks, 1.5 × 101 = 151.5 → 152 kopecks
    expect(computeErpLineAmountMicros(1.5, 1_010_000)).toBe(1_520_000);
  });

  it('is 0 for quantity 0 (boundary, not skipped)', () => {
    expect(computeErpLineAmountMicros(0, 50_000_000)).toBe(0);
  });

  it('is 0 for price 0 (boundary, not skipped)', () => {
    expect(computeErpLineAmountMicros(5, 0)).toBe(0);
  });
});
