import {
  type AccountMasterInfo,
  computeTrialBalanceRows,
  type RawAccountLegAggregate,
} from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';

const rub = (amount: number) => Math.round(amount * 100);

const account = (
  code: string,
  name: string,
  kind: AccountMasterInfo['kind'],
): AccountMasterInfo => ({ code, name, kind });

describe('computeTrialBalanceRows', () => {
  it('returns no rows and zero totals for an empty period', () => {
    const { rows, totals } = computeTrialBalanceRows(
      [],
      new Map<string, AccountMasterInfo>(),
    );

    expect(rows).toEqual([]);
    expect(totals).toEqual({
      openingDebitKopecks: 0,
      openingCreditKopecks: 0,
      turnoverDebitKopecks: 0,
      turnoverCreditKopecks: 0,
      closingDebitKopecks: 0,
      closingCreditKopecks: 0,
    });
  });

  it('omits an account with no turnover and a zero opening balance', () => {
    // Original 1000 + its full reversal −1000 sum to a zero opening net —
    // covers the ruling's «отменённая проводка не меняет сальдо» invariant.
    const aggregates: RawAccountLegAggregate[] = [
      {
        accountId: 'acc-1',
        openingDebitKopecks: rub(1000),
        openingCreditKopecks: rub(1000),
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: 0,
      },
    ];
    const accountsById = new Map([
      ['acc-1', account('41.01', 'Товары на складах', 'ACTIVE')],
    ]);

    const { rows } = computeTrialBalanceRows(aggregates, accountsById);

    expect(rows).toEqual([]);
  });

  it('keeps a row whose turnover is non-zero even if opening and closing are both zero', () => {
    // 62.01 receives an invoice (Дт 1220) and its full payment (Кт 1220) in
    // the same period — сальдо на начало и конец нулевые, but the account
    // had movement and must still print.
    const aggregates: RawAccountLegAggregate[] = [
      {
        accountId: 'acc-62',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(1220),
        turnoverCreditKopecks: rub(1220),
      },
    ];
    const accountsById = new Map([
      ['acc-62', account('62.01', 'Расчёты с покупателями', 'ACTIVE_PASSIVE')],
    ]);

    const { rows } = computeTrialBalanceRows(aggregates, accountsById);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      openingDebitKopecks: 0,
      openingCreditKopecks: 0,
      turnoverDebitKopecks: rub(1220),
      turnoverCreditKopecks: rub(1220),
      closingDebitKopecks: 0,
      closingCreditKopecks: 0,
    });
  });

  describe('ACTIVE account', () => {
    it('prints the net balance in Дт, positive or negative, never touching Кт', () => {
      const positiveNet: RawAccountLegAggregate = {
        accountId: 'acc-1',
        // opening 700 (1000 − 300), turnover 300 Дт / 100 Кт ⇒ closing 900
        openingDebitKopecks: rub(1000),
        openingCreditKopecks: rub(300),
        turnoverDebitKopecks: rub(300),
        turnoverCreditKopecks: rub(100),
      };
      const accountsById = new Map([
        ['acc-1', account('41.01', 'Товары на складах', 'ACTIVE')],
      ]);

      const { rows } = computeTrialBalanceRows([positiveNet], accountsById);

      expect(rows[0].openingDebitKopecks).toBe(rub(700));
      expect(rows[0].openingCreditKopecks).toBe(0);
      expect(rows[0].closingDebitKopecks).toBe(rub(900));
      expect(rows[0].closingCreditKopecks).toBe(0);

      // Abnormal balance (credit exceeds debit): 1С «красное сторно» —
      // simplified negative number stays in Дт, Кт remains untouched.
      const negativeNet: RawAccountLegAggregate = {
        accountId: 'acc-2',
        openingDebitKopecks: rub(100),
        openingCreditKopecks: rub(500),
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: 0,
      };
      const accountsById2 = new Map([
        ['acc-2', account('50', 'Касса', 'ACTIVE')],
      ]);

      const { rows: negativeRows } = computeTrialBalanceRows(
        [negativeNet],
        accountsById2,
      );

      expect(negativeRows[0].openingDebitKopecks).toBe(rub(-400));
      expect(negativeRows[0].openingCreditKopecks).toBe(0);
      expect(negativeRows[0].closingDebitKopecks).toBe(rub(-400));
      expect(negativeRows[0].closingCreditKopecks).toBe(0);
    });
  });

  describe('PASSIVE account', () => {
    it('prints the net balance in Кт, mirroring ACTIVE — abnormal balance prints negative in Кт', () => {
      // Normal case: credit exceeds debit (70 «Расчёты по оплате труда»).
      const normal: RawAccountLegAggregate = {
        accountId: 'acc-70',
        openingDebitKopecks: 0,
        openingCreditKopecks: rub(500),
        turnoverDebitKopecks: rub(500),
        turnoverCreditKopecks: rub(800),
      };
      const accountsById = new Map([
        ['acc-70', account('70', 'Расчёты по оплате труда', 'PASSIVE')],
      ]);

      const { rows } = computeTrialBalanceRows([normal], accountsById);

      expect(rows[0].openingDebitKopecks).toBe(0);
      expect(rows[0].openingCreditKopecks).toBe(rub(500));
      // closing net = −500 + 500 − 800 = −800 ⇒ Кт 800
      expect(rows[0].closingDebitKopecks).toBe(0);
      expect(rows[0].closingCreditKopecks).toBe(rub(800));

      // Abnormal: debit exceeds credit ⇒ negative number stays in Кт.
      const abnormal: RawAccountLegAggregate = {
        accountId: 'acc-80',
        openingDebitKopecks: rub(200),
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: 0,
      };
      const accountsById2 = new Map([
        ['acc-80', account('80', 'Уставный капитал', 'PASSIVE')],
      ]);

      const { rows: abnormalRows } = computeTrialBalanceRows(
        [abnormal],
        accountsById2,
      );

      expect(abnormalRows[0].openingDebitKopecks).toBe(0);
      expect(abnormalRows[0].openingCreditKopecks).toBe(rub(-200));
    });
  });

  describe('ACTIVE_PASSIVE account (развёрнутое сальдо)', () => {
    it('flips a negative net entirely to Кт as an absolute value, never a signed Дт', () => {
      // 60.01: opening 0, turnover Дт 200 / Кт 1200 ⇒ net −1000.
      const aggregate: RawAccountLegAggregate = {
        accountId: 'acc-60',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(200),
        turnoverCreditKopecks: rub(1200),
      };
      const accountsById = new Map([
        ['acc-60', account('60.01', 'Расчёты с поставщиками', 'ACTIVE_PASSIVE')],
      ]);

      const { rows } = computeTrialBalanceRows([aggregate], accountsById);

      expect(rows[0].closingDebitKopecks).toBe(0);
      // Absolute value, never rub(-1000): the whole point of «развёрнуто».
      expect(rows[0].closingCreditKopecks).toBe(rub(1000));
    });

    it('keeps a positive net entirely in Дт', () => {
      const aggregate: RawAccountLegAggregate = {
        accountId: 'acc-62',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(1220),
        turnoverCreditKopecks: rub(220),
      };
      const accountsById = new Map([
        ['acc-62', account('62.01', 'Расчёты с покупателями', 'ACTIVE_PASSIVE')],
      ]);

      const { rows } = computeTrialBalanceRows([aggregate], accountsById);

      expect(rows[0].closingDebitKopecks).toBe(rub(1000));
      expect(rows[0].closingCreditKopecks).toBe(0);
    });
  });

  it('falls back to id-as-code and развёрнуто presentation for an account missing from the план счетов', () => {
    const aggregate: RawAccountLegAggregate = {
      accountId: 'orphan-account-id',
      openingDebitKopecks: 0,
      openingCreditKopecks: 0,
      turnoverDebitKopecks: 0,
      turnoverCreditKopecks: rub(300),
    };

    const { rows } = computeTrialBalanceRows(
      [aggregate],
      new Map<string, AccountMasterInfo>(),
    );

    expect(rows[0].code).toBe('orphan-account-id');
    expect(rows[0].name).toBe('');
    // ACTIVE_PASSIVE fallback: negative net (−300) flips to Кт as a module.
    expect(rows[0].closingDebitKopecks).toBe(0);
    expect(rows[0].closingCreditKopecks).toBe(rub(300));
  });

  it('sorts rows by 1С-style numeric account code and balances Σдт=Σкт across a mixed set', () => {
    // Independent, hand-computed scenario mixing all three kinds — mirrors
    // osv-sample.html's verified arithmetic (Σ opening = Σ turnover = Σ
    // closing on each side).
    const aggregates: RawAccountLegAggregate[] = [
      {
        accountId: 'acc-41',
        openingDebitKopecks: rub(300),
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(1000),
        turnoverCreditKopecks: rub(400),
      },
      {
        accountId: 'acc-51',
        openingDebitKopecks: rub(5000),
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(1220),
        turnoverCreditKopecks: 0,
      },
      {
        accountId: 'acc-80',
        openingDebitKopecks: 0,
        openingCreditKopecks: rub(5300),
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: 0,
      },
      {
        accountId: 'acc-60',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: rub(1000),
      },
      {
        accountId: 'acc-90-01',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: rub(1220),
      },
      {
        accountId: 'acc-90-02',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(400),
        turnoverCreditKopecks: 0,
      },
      {
        accountId: 'acc-90-03',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(220),
        turnoverCreditKopecks: 0,
      },
      {
        accountId: 'acc-62',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(1220),
        turnoverCreditKopecks: rub(1220),
      },
      {
        accountId: 'acc-68',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: rub(220),
      },
      {
        accountId: 'acc-26',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: rub(500),
        turnoverCreditKopecks: 0,
      },
      {
        accountId: 'acc-71',
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 0,
        turnoverCreditKopecks: rub(500),
      },
    ];
    const accountsById = new Map<string, AccountMasterInfo>([
      ['acc-26', account('26', 'Общехозяйственные расходы', 'ACTIVE')],
      ['acc-41', account('41.01', 'Товары на складах', 'ACTIVE')],
      ['acc-51', account('51', 'Расчётные счета', 'ACTIVE')],
      ['acc-60', account('60.01', 'Расчёты с поставщиками', 'ACTIVE_PASSIVE')],
      ['acc-62', account('62.01', 'Расчёты с покупателями', 'ACTIVE_PASSIVE')],
      ['acc-68', account('68.02', 'НДС', 'ACTIVE_PASSIVE')],
      ['acc-71', account('71', 'Подотчётные лица', 'ACTIVE_PASSIVE')],
      ['acc-80', account('80', 'Уставный капитал', 'PASSIVE')],
      ['acc-90-01', account('90.01.1', 'Выручка', 'PASSIVE')],
      ['acc-90-02', account('90.02.1', 'Себестоимость продаж', 'ACTIVE')],
      ['acc-90-03', account('90.03', 'НДС с продаж', 'ACTIVE')],
    ]);

    const { rows, totals } = computeTrialBalanceRows(
      aggregates,
      accountsById,
    );

    expect(rows.map((row) => row.code)).toEqual([
      '26',
      '41.01',
      '51',
      '60.01',
      '62.01',
      '68.02',
      '71',
      '80',
      '90.01.1',
      '90.02.1',
      '90.03',
    ]);

    expect(totals.openingDebitKopecks).toBe(rub(5300));
    expect(totals.openingCreditKopecks).toBe(rub(5300));
    expect(totals.turnoverDebitKopecks).toBe(rub(4560));
    expect(totals.turnoverCreditKopecks).toBe(rub(4560));
    expect(totals.closingDebitKopecks).toBe(rub(8240));
    expect(totals.closingCreditKopecks).toBe(rub(8240));
  });
});
