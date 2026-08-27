import {
  type AccountTurnover,
  computeIncomeStatementLines,
} from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';

const rub = (amount: number) => Math.round(amount * 100);
const EMPTY = new Map<string, AccountTurnover>();

const byCode = (
  lines: ReturnType<typeof computeIncomeStatementLines>,
): Record<string, { currentKopecks: number; previousKopecks: number }> =>
  Object.fromEntries(lines.map((line) => [line.code, line]));

describe('computeIncomeStatementLines', () => {
  it('returns all 8 lines at zero for no turnover', () => {
    const lines = computeIncomeStatementLines(EMPTY, EMPTY);

    expect(lines.map((line) => line.code)).toEqual([
      '2110',
      '2120',
      '2330',
      '2340',
      '2350',
      '2410',
      '2300',
      '2400',
    ]);
    expect(lines.every((line) => line.currentKopecks === 0)).toBe(true);
  });

  it('2110 (revenue) = Кт90.01.1 − Дт90.03 — independent of every other line', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(1220) }],
      ['90.03', { debitKopecks: rub(220), creditKopecks: 0 }],
    ]);

    const lines = computeIncomeStatementLines(turnover, EMPTY);

    expect(byCode(lines)['2110'].currentKopecks).toBe(rub(1000));
  });

  it('2120 (cost) = Дт90.02.1 only', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['90.02.1', { debitKopecks: rub(400), creditKopecks: 0 }],
    ]);

    const lines = computeIncomeStatementLines(turnover, EMPTY);

    expect(byCode(lines)['2120'].currentKopecks).toBe(rub(400));
  });

  it('2340/2350 read 91.01/91.02 independently of 2110/2120', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['91.01', { debitKopecks: 0, creditKopecks: rub(300) }],
      ['91.02', { debitKopecks: rub(120), creditKopecks: 0 }],
    ]);

    const lines = computeIncomeStatementLines(turnover, EMPTY);

    expect(byCode(lines)['2340'].currentKopecks).toBe(rub(300));
    expect(byCode(lines)['2350'].currentKopecks).toBe(rub(120));
    // Untouched revenue/cost lines stay zero — proves independence.
    expect(byCode(lines)['2110'].currentKopecks).toBe(0);
    expect(byCode(lines)['2120'].currentKopecks).toBe(0);
  });

  it('2330 and 2410 are always 0 in this MVP (documented — ofr-spec.md §4)', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(5000) }],
      ['91.02', { debitKopecks: rub(1000), creditKopecks: 0 }],
    ]);

    const lines = computeIncomeStatementLines(turnover, EMPTY);

    expect(byCode(lines)['2330'].currentKopecks).toBe(0);
    expect(byCode(lines)['2410'].currentKopecks).toBe(0);
  });

  it('2300/2400 = revenue − cost + otherIncome − otherExpenses − interest, and 2400 = 2300 (no tax yet)', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(1220) }],
      ['90.03', { debitKopecks: rub(220), creditKopecks: 0 }],
      ['90.02.1', { debitKopecks: rub(400), creditKopecks: 0 }],
    ]);

    const lines = computeIncomeStatementLines(turnover, EMPTY);
    const result = byCode(lines);

    expect(result['2300'].currentKopecks).toBe(rub(600)); // 1000 − 400
    expect(result['2400'].currentKopecks).toBe(rub(600));
  });

  // CRITICAL ruling (controller conflict-scan, phase9-accounting-depth.md
  // Task 1): a 90.09/91.09/99 balance must NEVER leak into any line — the
  // explicit account-code list construction (not a `LIKE '90.%'` pattern)
  // is what guarantees this even once Task 5 «Закрытие месяца» starts
  // writing those transfer entries.
  it('ignores 90.09/91.09/99 turnover entirely, even when non-zero', () => {
    const turnover = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(1220) }],
      ['90.03', { debitKopecks: rub(220), creditKopecks: 0 }],
      ['90.02.1', { debitKopecks: rub(400), creditKopecks: 0 }],
      // Closing transfers a future monthClose might write — must be inert.
      ['90.09', { debitKopecks: rub(600), creditKopecks: 0 }],
      ['91.09', { debitKopecks: 0, creditKopecks: rub(999) }],
      ['99', { debitKopecks: rub(600), creditKopecks: 0 }],
    ]);

    const withClosingNoise = computeIncomeStatementLines(turnover, EMPTY);
    const withoutClosingNoise = computeIncomeStatementLines(
      new Map<string, AccountTurnover>([
        ['90.01.1', { debitKopecks: 0, creditKopecks: rub(1220) }],
        ['90.03', { debitKopecks: rub(220), creditKopecks: 0 }],
        ['90.02.1', { debitKopecks: rub(400), creditKopecks: 0 }],
      ]),
      EMPTY,
    );

    expect(withClosingNoise).toEqual(withoutClosingNoise);
  });

  it('computes the previous-year column independently of the current one', () => {
    const current = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(1220) }],
    ]);
    const previous = new Map<string, AccountTurnover>([
      ['90.01.1', { debitKopecks: 0, creditKopecks: rub(600) }],
    ]);

    const lines = computeIncomeStatementLines(current, previous);
    const result = byCode(lines);

    expect(result['2110'].currentKopecks).toBe(rub(1220));
    expect(result['2110'].previousKopecks).toBe(rub(600));
  });
});
