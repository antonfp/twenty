import {
  previousYearEndDate,
  previousYearPeriod,
} from 'src/engine/core-modules/erp-accounting/utils/report-comparative-period.util';

describe('previousYearEndDate', () => {
  it('returns 31 December of the prior year, regardless of the input day/month', () => {
    expect(previousYearEndDate('2026-08-31')).toBe('2025-12-31');
    expect(previousYearEndDate('2026-01-01')).toBe('2025-12-31');
    expect(previousYearEndDate('2028-02-29')).toBe('2027-12-31');
  });
});

describe('previousYearPeriod', () => {
  it('shifts both dates back one calendar year, same month/day', () => {
    expect(previousYearPeriod('2026-08-01', '2026-08-31')).toEqual({
      dateFrom: '2025-08-01',
      dateTo: '2025-08-31',
    });
  });

  it('clamps 29 February to 28 when the target year is not a leap year', () => {
    // 2028 is a leap year, 2027 is not.
    expect(previousYearPeriod('2028-02-29', '2028-02-29')).toEqual({
      dateFrom: '2027-02-28',
      dateTo: '2027-02-28',
    });
  });

  it('clamps to 28 February for any non-leap target year, one year back', () => {
    // 2024 is a leap year, its immediate predecessor 2023 is not.
    expect(previousYearPeriod('2024-02-29', '2024-02-29')).toEqual({
      dateFrom: '2023-02-28',
      dateTo: '2023-02-28',
    });
  });
});
