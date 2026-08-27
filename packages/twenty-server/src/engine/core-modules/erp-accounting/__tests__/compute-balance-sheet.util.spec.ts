import { computeBalanceSheetLines } from 'src/engine/core-modules/erp-accounting/utils/compute-balance-sheet.util';

const rub = (amount: number) => Math.round(amount * 100);
const EMPTY = new Map<string, number>();

describe('computeBalanceSheetLines', () => {
  it('returns all zero lines and zero totals for no data', () => {
    const { lines, totals } = computeBalanceSheetLines(EMPTY, EMPTY);

    expect(lines).toHaveLength(11);
    expect(lines.every((line) => line.currentKopecks === 0)).toBe(true);
    expect(lines.every((line) => line.previousKopecks === 0)).toBe(true);
    expect(totals).toEqual({
      assetsCurrentKopecks: 0,
      assetsPreviousKopecks: 0,
      liabilitiesCurrentKopecks: 0,
      liabilitiesPreviousKopecks: 0,
    });
  });

  describe('each line reads independent, hand-computed numbers', () => {
    it('1150 sums 01/02/08 as a raw net (contra 02 subtracts)', () => {
      const netByCode = new Map([
        ['01', rub(1000)],
        ['02', rub(-200)], // Амортизация — контрсчёт, кредитовое сальдо
        ['08', rub(300)],
      ]);

      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);
      const line1150 = lines.find((line) => line.code === '1150');

      expect(line1150?.currentKopecks).toBe(rub(1100)); // 1000 − 200 + 300
    });

    it('1170 reads 04 only', () => {
      const netByCode = new Map([['04', rub(555)]]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1170')?.currentKopecks).toBe(
        rub(555),
      );
    });

    it('1210 folds 26/94 in alongside 10/41.01/20/44/19.04', () => {
      const netByCode = new Map([
        ['10', rub(100)],
        ['41.01', rub(200)],
        ['20', rub(50)],
        ['44', rub(25)],
        ['19.04', 0],
        ['26', rub(500)], // MVP fold-in — see balance-spec.md §3.2
        ['94', rub(10)], // MVP fold-in
      ]);

      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1210')?.currentKopecks).toBe(
        rub(885),
      );
    });

    it('1250 sums 50/51', () => {
      const netByCode = new Map([
        ['50', rub(1000)],
        ['51', rub(6220)],
      ]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1250')?.currentKopecks).toBe(
        rub(7220),
      );
    });

    it('a code outside the mapping contributes to no line (documented limitation)', () => {
      const netByCode = new Map([['99.02', rub(1000)]]);
      const { lines, totals } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.every((line) => line.currentKopecks === 0)).toBe(true);
      expect(totals.assetsCurrentKopecks).toBe(0);
      expect(totals.liabilitiesCurrentKopecks).toBe(0);
    });
  });

  describe('«развёрнуто по сальдо» — только 60.01/62.01/71/76 (ruling)', () => {
    it('a debit-side (positive) net goes entirely to 1230, nothing to 1520', () => {
      const netByCode = new Map([
        ['60.01', rub(300)], // аванс поставщику — реальный актив
        ['62.01', rub(0)],
        ['71', rub(0)],
        ['76', rub(0)],
      ]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1230')?.currentKopecks).toBe(
        rub(300),
      );
      expect(lines.find((line) => line.code === '1520')?.currentKopecks).toBe(
        0,
      );
    });

    it('a credit-side (negative) net goes entirely to 1520 as its absolute value, nothing to 1230', () => {
      const netByCode = new Map([
        ['60.01', rub(-1000)], // задолженность поставщику
        ['62.01', 0],
        ['71', rub(-500)], // задолженность перед подотчётным лицом
        ['76', 0],
      ]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1230')?.currentKopecks).toBe(
        0,
      );
      expect(lines.find((line) => line.code === '1520')?.currentKopecks).toBe(
        rub(1500),
      );
    });

    it('68.01/68.02/69/70/75 are NOT split — always a single line (1520), even when debit', () => {
      // Ruling names only 60/62/71/76 for the split; a debit balance on
      // one of the other AP accounts still lands (negatively) on 1520,
      // never on 1230 — documented in balance-spec.md §3.4.
      const netByCode = new Map([['75', rub(400)]]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      expect(lines.find((line) => line.code === '1230')?.currentKopecks).toBe(
        0,
      );
      expect(lines.find((line) => line.code === '1520')?.currentKopecks).toBe(
        rub(-400),
      );
    });
  });

  describe('1370 folds in the live (unclosed) P&L result', () => {
    it('revenue (credit) increases 1370, cost/VAT (debit) decrease it', () => {
      const netByCode = new Map([
        ['80', rub(-5300)], // уставный капитал
        ['90.01.1', rub(-1220)], // выручка (кредит)
        ['90.02.1', rub(400)], // себестоимость (дебет)
        ['90.03', rub(220)], // НДС с выручки (дебет)
      ]);
      const { lines } = computeBalanceSheetLines(netByCode, EMPTY);

      // −(−5300 −1220 +400 +220) = 5900
      expect(lines.find((line) => line.code === '1370')?.currentKopecks).toBe(
        rub(5900),
      );
    });
  });

  it('актив=пассив on a full balanced test-posting scenario (independent of the earlier per-line tests)', () => {
    // Mirrors osv-sample.html/balance-sample.html's verified scenario:
    // Σ over ALL touched accounts = 0 (double-entry identity) — proves the
    // mapping covers every account exactly once (or split-but-conserving),
    // per balance-spec.md §3.3.1.
    const netByCode = new Map([
      ['26', rub(500)],
      ['41.01', rub(900)],
      ['51', rub(6220)],
      ['60.01', rub(-1000)],
      ['62.01', 0],
      ['68.02', rub(-220)],
      ['71', rub(-500)],
      ['80', rub(-5300)],
      ['90.01.1', rub(-1220)],
      ['90.02.1', rub(400)],
      ['90.03', rub(220)],
    ]);

    const { totals } = computeBalanceSheetLines(netByCode, EMPTY);

    expect(totals.assetsCurrentKopecks).toBe(rub(7620));
    expect(totals.liabilitiesCurrentKopecks).toBe(rub(7620));
    expect(totals.assetsCurrentKopecks).toBe(totals.liabilitiesCurrentKopecks);
  });

  it('computes the previous column independently of the current one', () => {
    const current = new Map([['51', rub(1000)]]);
    const previous = new Map([
      ['51', rub(500)],
      ['80', rub(-500)],
    ]);

    const { lines, totals } = computeBalanceSheetLines(current, previous);

    const line1250 = lines.find((line) => line.code === '1250');

    expect(line1250?.currentKopecks).toBe(rub(1000));
    expect(line1250?.previousKopecks).toBe(rub(500));
    expect(totals.assetsPreviousKopecks).toBe(rub(500));
    expect(totals.liabilitiesPreviousKopecks).toBe(rub(500));
  });
});
