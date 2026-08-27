import {
  computeMonthCloseLegs,
  firstDayOfNextMonth,
  type MonthCloseLegDraft,
} from 'src/engine/core-modules/erp-accounting/utils/compute-month-close.util';
import { type AccountTurnover } from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';

const turnover = (
  debitKopecks: number,
  creditKopecks: number,
): AccountTurnover => ({ debitKopecks, creditKopecks });

const byCode = (
  entries: Record<string, AccountTurnover>,
): ReadonlyMap<string, AccountTurnover> => new Map(Object.entries(entries));

const findLeg = (
  legs: MonthCloseLegDraft[],
  debitCode: string,
  creditCode: string,
): MonthCloseLegDraft | undefined =>
  legs.find(
    (leg) => leg.debitCode === debitCode && leg.creditCode === creditCode,
  );

describe('computeMonthCloseLegs', () => {
  it('closes a profitable month: Дт 90.09 Кт 99 for revenue - cost - vat', () => {
    const monthly = byCode({
      '90.01.1': turnover(0, 100_000),
      '90.02.1': turnover(60_000, 0),
      '90.03': turnover(10_000, 0),
    });

    const { legs, hasMonthlyTurnover } = computeMonthCloseLegs(monthly);

    expect(hasMonthlyTurnover).toBe(true);
    // 100_000 - 60_000 - 10_000 = 30_000
    expect(findLeg(legs, '90.09', '99')).toEqual({
      debitCode: '90.09',
      creditCode: '99',
      amountKopecks: 30_000,
    });
  });

  it('closes a loss month the other way: Дт 99 Кт 90.09 — independent numbers from the profit case', () => {
    const monthly = byCode({
      '90.01.1': turnover(0, 50_000),
      '90.02.1': turnover(70_000, 0),
      '90.03': turnover(5_000, 0),
    });

    const { legs } = computeMonthCloseLegs(monthly);

    // 50_000 - 70_000 - 5_000 = -25_000 → loss, sides swap, amount is |Δ|.
    expect(findLeg(legs, '99', '90.09')).toEqual({
      debitCode: '99',
      creditCode: '90.09',
      amountKopecks: 25_000,
    });
  });

  it('closes 91.09 independently of the 90.09 result', () => {
    const monthly = byCode({
      '90.01.1': turnover(0, 100_000),
      '90.02.1': turnover(60_000, 0),
      '90.03': turnover(10_000, 0),
      '91.01': turnover(0, 8_000),
      '91.02': turnover(3_000, 0),
    });

    const { legs } = computeMonthCloseLegs(monthly);

    expect(findLeg(legs, '90.09', '99')).toMatchObject({
      amountKopecks: 30_000,
    });
    // 8_000 - 3_000 = 5_000, unrelated to the 90.09 figure above.
    expect(findLeg(legs, '91.09', '99')).toEqual({
      debitCode: '91.09',
      creditCode: '99',
      amountKopecks: 5_000,
    });
  });

  it('reports no turnover and zero-amount legs for an empty month (нулевой месяц)', () => {
    const { legs, hasMonthlyTurnover } = computeMonthCloseLegs(byCode({}));

    expect(hasMonthlyTurnover).toBe(false);
    expect(legs.every((leg) => leg.amountKopecks === 0)).toBe(true);
  });

  it('reports turnover even when it nets to a zero result (real activity, not a нулевой месяц)', () => {
    const monthly = byCode({
      '90.01.1': turnover(0, 10_000),
      '90.02.1': turnover(10_000, 0),
    });

    const { hasMonthlyTurnover } = computeMonthCloseLegs(monthly);

    expect(hasMonthlyTurnover).toBe(true);
  });

  it('реформация: zeroes 90.x/91.x by their YEARLY balance and closes 99→84 — independent from the December-only monthly legs', () => {
    const monthly = byCode({
      '90.01.1': turnover(0, 100_000),
      '90.02.1': turnover(60_000, 0),
      '90.03': turnover(10_000, 0),
      '91.01': turnover(0, 8_000),
      '91.02': turnover(3_000, 0),
    });
    const yearly = byCode({
      '90.01.1': turnover(0, 500_000),
      '90.02.1': turnover(300_000, 0),
      '90.03': turnover(50_000, 0),
      '91.01': turnover(0, 20_000),
      '91.02': turnover(5_000, 0),
    });

    const { legs } = computeMonthCloseLegs(monthly, yearly);

    // December's own monthly closing legs are still there, unaffected by
    // reformation (same numbers as the plain profit-month test above).
    expect(findLeg(legs, '90.09', '99')).toMatchObject({
      amountKopecks: 30_000,
    });
    expect(findLeg(legs, '91.09', '99')).toMatchObject({
      amountKopecks: 5_000,
    });

    // Zeroing legs use the YEARLY balance, not December's.
    expect(findLeg(legs, '90.01.1', '90.09')).toEqual({
      debitCode: '90.01.1',
      creditCode: '90.09',
      amountKopecks: 500_000,
    });
    expect(findLeg(legs, '90.09', '90.02.1')).toEqual({
      debitCode: '90.09',
      creditCode: '90.02.1',
      amountKopecks: 300_000,
    });
    expect(findLeg(legs, '90.09', '90.03')).toEqual({
      debitCode: '90.09',
      creditCode: '90.03',
      amountKopecks: 50_000,
    });
    expect(findLeg(legs, '91.01', '91.09')).toEqual({
      debitCode: '91.01',
      creditCode: '91.09',
      amountKopecks: 20_000,
    });
    expect(findLeg(legs, '91.09', '91.02')).toEqual({
      debitCode: '91.09',
      creditCode: '91.02',
      amountKopecks: 5_000,
    });

    // 99→84: (500_000-300_000-50_000) + (20_000-5_000) = 165_000, профит.
    expect(findLeg(legs, '99', '84')).toEqual({
      debitCode: '99',
      creditCode: '84',
      amountKopecks: 165_000,
    });
  });

  it('реформация при убытке года: закрывает 84→99', () => {
    const yearly = byCode({
      '90.01.1': turnover(0, 100_000),
      '90.02.1': turnover(300_000, 0),
    });

    const { legs } = computeMonthCloseLegs(byCode({}), yearly);

    // 100_000 - 300_000 = -200_000 → убыток, стороны меняются местами.
    expect(findLeg(legs, '84', '99')).toEqual({
      debitCode: '84',
      creditCode: '99',
      amountKopecks: 200_000,
    });
  });
});

describe('firstDayOfNextMonth', () => {
  it('rolls a mid-year month over', () => {
    expect(firstDayOfNextMonth('2026-08-01')).toBe('2026-09-01');
  });

  it('rolls December into January of the next year', () => {
    expect(firstDayOfNextMonth('2026-12-01')).toBe('2027-01-01');
  });
});
