import {
  formatDateRuLong,
  formatDateRuShort,
  formatMoneyRu,
  formatQuantityRu,
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
