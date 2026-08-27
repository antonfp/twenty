import {
  formatDateRuLong,
  formatDateRuShort,
  formatMoneyRu,
  formatQuantityRu,
  formatThousandRoublesRu,
  roundKopecksToThousandRoubles,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';

const NBSP = ' ';

describe('formatMoneyRu', () => {
  it('groups digits with non-breaking spaces and uses a comma separator', () => {
    expect(formatMoneyRu(123456789)).toBe(`1${NBSP}234${NBSP}567,89`);
    expect(formatMoneyRu(360000)).toBe(`3${NBSP}600,00`);
    expect(formatMoneyRu(5)).toBe('0,05');
    expect(formatMoneyRu(-10050)).toBe('-100,50');
  });
});

describe('formatDateRu', () => {
  it('formats short and long russian dates', () => {
    expect(formatDateRuShort('2026-08-25')).toBe('25.08.2026');
    expect(formatDateRuLong('2026-08-25')).toBe('25 августа 2026 г.');
  });
});

describe('formatQuantityRu', () => {
  it('trims trailing zeros and keeps up to 3 decimals', () => {
    expect(formatQuantityRu(10)).toBe('10');
    expect(formatQuantityRu(0.5)).toBe('0,5');
    expect(formatQuantityRu(1234.567)).toBe(`1${NBSP}234,567`);
  });
});

describe('roundKopecksToThousandRoubles', () => {
  it('rounds normally away from an exact half', () => {
    expect(roundKopecksToThousandRoubles(149_999)).toBe(1); // 1,49999 тыс.
    expect(roundKopecksToThousandRoubles(762_000)).toBe(8); // 7,62 тыс. (balance-sample.html)
    expect(roundKopecksToThousandRoubles(40_000)).toBe(0); // 0,4 тыс. (ofr-sample.html)
  });

  it('rounds an exact half to the even neighbour (banker’s rounding)', () => {
    expect(roundKopecksToThousandRoubles(50_000)).toBe(0); // 0,5 тыс. → 0 (even)
    expect(roundKopecksToThousandRoubles(150_000)).toBe(2); // 1,5 тыс. → 2 (even)
    expect(roundKopecksToThousandRoubles(250_000)).toBe(2); // 2,5 тыс. → 2 (already even)
    expect(roundKopecksToThousandRoubles(350_000)).toBe(4); // 3,5 тыс. → 4 (even)
  });

  it('mirrors the sign for negative amounts', () => {
    expect(roundKopecksToThousandRoubles(-150_000)).toBe(-2);
    expect(roundKopecksToThousandRoubles(-40_000)).toBe(0);
  });

  it('leaves an exact multiple of a thousand roubles untouched', () => {
    expect(roundKopecksToThousandRoubles(0)).toBe(0);
    expect(roundKopecksToThousandRoubles(500_000)).toBe(5);
  });
});

describe('formatThousandRoublesRu', () => {
  it('groups digits with non-breaking spaces, no fraction', () => {
    expect(formatThousandRoublesRu(123_400_000)).toBe(`1${NBSP}234`);
    expect(formatThousandRoublesRu(762_000)).toBe('8');
    expect(formatThousandRoublesRu(-150_000)).toBe('-2');
    expect(formatThousandRoublesRu(0)).toBe('0');
  });
});
