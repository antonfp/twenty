import {
  type AccountCardAccountKind,
  computeAccountCardRows,
  type RawAccountCardLeg,
} from 'src/engine/core-modules/erp-accounting/utils/compute-account-card.util';

const rub = (amount: number) => Math.round(amount * 100);

const leg = (overrides: Partial<RawAccountCardLeg>): RawAccountCardLeg => ({
  glEntryId: 'gl-1',
  date: '2026-08-25',
  isDebit: true,
  amountKopecks: 0,
  correspondingAccountId: 'corr-1',
  voucherType: 'payment',
  voucherId: 'voucher-1',
  ...overrides,
});

describe('computeAccountCardRows', () => {
  it('returns no rows and opening=closing for an empty period', () => {
    const {
      rows,
      openingBalance,
      closingBalance,
      totalDebitKopecks,
      totalCreditKopecks,
    } = computeAccountCardRows(
      [],
      { openingDebitKopecks: 0, openingCreditKopecks: 0 },
      'ACTIVE',
    );

    expect(rows).toEqual([]);
    expect(openingBalance).toEqual({ debitKopecks: 0, creditKopecks: 0 });
    expect(closingBalance).toEqual({ debitKopecks: 0, creditKopecks: 0 });
    expect(totalDebitKopecks).toBe(0);
    expect(totalCreditKopecks).toBe(0);
  });

  it('carries a non-zero opening balance through an empty period unchanged', () => {
    const { rows, openingBalance, closingBalance } = computeAccountCardRows(
      [],
      { openingDebitKopecks: rub(1220), openingCreditKopecks: 0 },
      'ACTIVE',
    );

    expect(rows).toEqual([]);
    expect(openingBalance).toEqual({
      debitKopecks: rub(1220),
      creditKopecks: 0,
    });
    expect(closingBalance).toEqual({
      debitKopecks: rub(1220),
      creditKopecks: 0,
    });
  });

  describe('входящее сальдо по kind счёта', () => {
    it.each<
      [
        AccountCardAccountKind,
        number,
        number,
        { debitKopecks: number; creditKopecks: number },
      ]
    >([
      // ACTIVE: net stays in Дт.
      [
        'ACTIVE',
        rub(1000),
        rub(300),
        { debitKopecks: rub(700), creditKopecks: 0 },
      ],
      // PASSIVE: net (credit-heavy) mirrors into Кт.
      [
        'PASSIVE',
        rub(100),
        rub(800),
        { debitKopecks: 0, creditKopecks: rub(700) },
      ],
      // ACTIVE_PASSIVE («развёрнуто»): positive net stays in Дт.
      [
        'ACTIVE_PASSIVE',
        rub(1220),
        rub(220),
        { debitKopecks: rub(1000), creditKopecks: 0 },
      ],
      // ACTIVE_PASSIVE, negative net: absolute value moves to Кт (never a
      // signed Дт) — the whole point of «развёрнуто».
      [
        'ACTIVE_PASSIVE',
        rub(200),
        rub(1200),
        { debitKopecks: 0, creditKopecks: rub(1000) },
      ],
    ])(
      'kind=%s: opening debit=%d credit=%d -> %j',
      (kind, openingDebitKopecks, openingCreditKopecks, expected) => {
        const { openingBalance } = computeAccountCardRows(
          [],
          { openingDebitKopecks, openingCreditKopecks },
          kind,
        );

        expect(openingBalance).toEqual(expected);
      },
    );
  });

  describe('сальдо нарастающим итогом — направление по позиции счёта в проводке', () => {
    it('a debit leg increases the Дт side of the running balance (ACTIVE account)', () => {
      const legs: RawAccountCardLeg[] = [
        leg({ glEntryId: 'gl-1', isDebit: true, amountKopecks: rub(1220) }),
      ];

      const { rows } = computeAccountCardRows(
        legs,
        { openingDebitKopecks: 0, openingCreditKopecks: 0 },
        'ACTIVE',
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].debitKopecks).toBe(rub(1220));
      expect(rows[0].creditKopecks).toBe(0);
      expect(rows[0].runningBalanceDebitKopecks).toBe(rub(1220));
      expect(rows[0].runningBalanceCreditKopecks).toBe(0);
    });

    it('a credit leg decreases the running net, flipping the printed side once it goes negative (ACTIVE account)', () => {
      const legs: RawAccountCardLeg[] = [
        leg({ glEntryId: 'gl-1', isDebit: true, amountKopecks: rub(500) }),
        leg({ glEntryId: 'gl-2', isDebit: false, amountKopecks: rub(800) }),
      ];

      const { rows, closingBalance } = computeAccountCardRows(
        legs,
        { openingDebitKopecks: 0, openingCreditKopecks: 0 },
        'ACTIVE',
      );

      expect(rows[0].runningBalanceDebitKopecks).toBe(rub(500));
      // Running net after leg 2: 500 - 800 = -300 -> ACTIVE prints the
      // negative number in Дт (1С «красное сторно»), never moves to Кт.
      expect(rows[1].runningBalanceDebitKopecks).toBe(rub(-300));
      expect(rows[1].runningBalanceCreditKopecks).toBe(0);
      expect(closingBalance).toEqual({
        debitKopecks: rub(-300),
        creditKopecks: 0,
      });
    });

    it('accumulates strictly in chronological (caller-supplied) order across three legs, ACTIVE_PASSIVE account', () => {
      const legs: RawAccountCardLeg[] = [
        leg({
          glEntryId: 'gl-1',
          date: '2026-08-01',
          isDebit: true,
          amountKopecks: rub(1220),
        }),
        leg({
          glEntryId: 'gl-2',
          date: '2026-08-10',
          isDebit: false,
          amountKopecks: rub(1220),
        }),
        leg({
          glEntryId: 'gl-3',
          date: '2026-08-20',
          isDebit: false,
          amountKopecks: rub(300),
        }),
      ];

      const { rows, closingBalance, totalDebitKopecks, totalCreditKopecks } =
        computeAccountCardRows(
          legs,
          { openingDebitKopecks: 0, openingCreditKopecks: 0 },
          'ACTIVE_PASSIVE',
        );

      // running net: +1220 -> 0 -> -300
      expect(rows[0].runningBalanceDebitKopecks).toBe(rub(1220));
      expect(rows[1].runningBalanceDebitKopecks).toBe(0);
      expect(rows[1].runningBalanceCreditKopecks).toBe(0);
      // ACTIVE_PASSIVE flips the negative net to Кт as an absolute value.
      expect(rows[2].runningBalanceDebitKopecks).toBe(0);
      expect(rows[2].runningBalanceCreditKopecks).toBe(rub(300));
      expect(closingBalance).toEqual({
        debitKopecks: 0,
        creditKopecks: rub(300),
      });
      expect(totalDebitKopecks).toBe(rub(1220));
      expect(totalCreditKopecks).toBe(rub(1520));
    });

    // Review Major (Task 2): the карточка renders a сторно leg as its OWN
    // row — same account, same side, literal negative amount (buildReversalRows
    // negates in place, never swaps debitAccountId/creditAccountId — see
    // build-reversal-rows.util.ts) — never flips the negative to the other
    // column. Mirrors ОСВ's «сторно нейтрализует оригинал арифметически, не
    // фильтрацией» invariant (compute-trial-balance.util.spec.ts) at the
    // per-row level: the pair's combined turnover is exactly zero.
    it('a leg and its сторно reversal print as two rows, negative amount in the SAME column, running balance returns to its pre-leg value, totals net to zero (ОСВ semantics)', () => {
      const legs: RawAccountCardLeg[] = [
        leg({
          glEntryId: 'gl-original',
          date: '2026-08-25',
          isDebit: true,
          amountKopecks: rub(500),
          correspondingAccountId: 'account-71',
          voucherType: 'manualEntry',
          voucherId: 'me-1',
        }),
        // Реверс: тот же debitAccountId (та же карточка, тот же счёт), та
        // же correspondingAccountId/voucherType/voucherId — только
        // amountKopecks отрицательный (buildReversalRows негирует
        // amountAmountMicros на месте, не переставляя дебет/кредит).
        leg({
          glEntryId: 'gl-reversal',
          date: '2026-08-25',
          isDebit: true,
          amountKopecks: -rub(500),
          correspondingAccountId: 'account-71',
          voucherType: 'manualEntry',
          voucherId: 'me-1',
        }),
      ];

      const {
        rows,
        openingBalance,
        closingBalance,
        totalDebitKopecks,
        totalCreditKopecks,
      } = computeAccountCardRows(
        legs,
        { openingDebitKopecks: rub(100), openingCreditKopecks: 0 },
        'ACTIVE',
      );

      expect(rows).toHaveLength(2);

      // Original: +500 в Дт, никогда не в Кт.
      expect(rows[0]).toMatchObject({
        debitKopecks: rub(500),
        creditKopecks: 0,
      });
      expect(rows[0].runningBalanceDebitKopecks).toBe(rub(600));
      expect(rows[0].runningBalanceCreditKopecks).toBe(0);

      // Реверс: −500 остаётся в ТОЙ ЖЕ колонке Дт (не переезжает в Кт) —
      // ключевая проверка ревью.
      expect(rows[1]).toMatchObject({
        debitKopecks: -rub(500),
        creditKopecks: 0,
      });
      // Сальдо нарастающим итогом возвращается к значению ДО пары
      // ориг./сторно — тому же, что и входящее сальдо (пары в периоде
      // больше не было).
      expect(rows[1].runningBalanceDebitKopecks).toBe(rub(100));
      expect(rows[1].runningBalanceCreditKopecks).toBe(0);
      expect(closingBalance).toEqual(openingBalance);

      // Обороты за пару равны нулю с обеих сторон — тот же принцип «сумма
      // без фильтрации по isCancellation», что и в ОСВ.
      expect(totalDebitKopecks).toBe(0);
      expect(totalCreditKopecks).toBe(0);
    });
  });

  it('starts the running balance from a non-zero opening net (сверка with ОСВ closing = opening + turnover)', () => {
    const legs: RawAccountCardLeg[] = [
      leg({ glEntryId: 'gl-1', isDebit: true, amountKopecks: rub(1220) }),
    ];

    const { rows, openingBalance, closingBalance } = computeAccountCardRows(
      legs,
      { openingDebitKopecks: rub(600), openingCreditKopecks: 0 },
      'ACTIVE',
    );

    expect(openingBalance).toEqual({
      debitKopecks: rub(600),
      creditKopecks: 0,
    });
    expect(rows[0].runningBalanceDebitKopecks).toBe(rub(1820));
    expect(closingBalance).toEqual({
      debitKopecks: rub(1820),
      creditKopecks: 0,
    });
  });

  it("preserves each leg's correspondingAccountId/voucherType/voucherId untouched", () => {
    const legs: RawAccountCardLeg[] = [
      leg({
        glEntryId: 'gl-1',
        correspondingAccountId: 'account-62',
        voucherType: 'payment',
        voucherId: 'payment-1',
        isDebit: true,
        amountKopecks: rub(1220),
      }),
      leg({
        glEntryId: 'gl-2',
        correspondingAccountId: null,
        voucherType: null,
        voucherId: null,
        isDebit: false,
        amountKopecks: rub(100),
      }),
    ];

    const { rows } = computeAccountCardRows(
      legs,
      { openingDebitKopecks: 0, openingCreditKopecks: 0 },
      'ACTIVE',
    );

    expect(rows[0]).toMatchObject({
      correspondingAccountId: 'account-62',
      voucherType: 'payment',
      voucherId: 'payment-1',
    });
    expect(rows[1]).toMatchObject({
      correspondingAccountId: null,
      voucherType: null,
      voucherId: null,
    });
  });
});
