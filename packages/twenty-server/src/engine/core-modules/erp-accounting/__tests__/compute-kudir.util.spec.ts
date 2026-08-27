import {
  buildKudirEntries,
  findQuantityThresholdDate,
  type KudirRawEntry,
  matchGoodsExpenseLine,
} from 'src/engine/core-modules/erp-accounting/utils/compute-kudir.util';

const rawEntry = (overrides: Partial<KudirRawEntry>): KudirRawEntry => ({
  date: '2026-01-15',
  documentLabel: 'Поступление оплаты № PAY-000001 от 15.01.2026',
  content: 'Оплата по счёту № SI-000001 от 10.01.2026, ООО Ромашка',
  incomeKopecks: 0,
  expenseKopecks: 0,
  ...overrides,
});

describe('buildKudirEntries', () => {
  it('returns 4 zero cumulative-total rows and no movement rows for an empty year', () => {
    const { entries, totalIncomeKopecks, totalExpenseKopecks } =
      buildKudirEntries([]);

    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.seq === null)).toBe(true);
    expect(entries.map((entry) => entry.content)).toEqual([
      'Итого за I квартал',
      'Итого за полугодие',
      'Итого за 9 месяцев',
      'Итого за год',
    ]);
    expect(entries.every((entry) => entry.incomeKopecks === 0)).toBe(true);
    expect(totalIncomeKopecks).toBe(0);
    expect(totalExpenseKopecks).toBe(0);
  });

  it('numbers a single Q1 entry and carries its total through all 4 checkpoints', () => {
    const { entries, totalIncomeKopecks } = buildKudirEntries([
      rawEntry({ date: '2026-02-10', incomeKopecks: 100_000 }),
    ]);

    expect(entries).toHaveLength(5); // 1 movement + 4 totals
    expect(entries[0]).toEqual(
      expect.objectContaining({
        seq: 1,
        date: '2026-02-10',
        incomeKopecks: 100_000,
      }),
    );
    // Every checkpoint from Q1 onward carries the same cumulative total —
    // the entry happened before all of them.
    const totalRows = entries.slice(1);

    expect(totalRows.every((row) => row.incomeKopecks === 100_000)).toBe(true);
    expect(totalIncomeKopecks).toBe(100_000);
  });

  it('accumulates нарастающим итогом across quarters, not per-quarter deltas', () => {
    const { entries } = buildKudirEntries([
      rawEntry({ date: '2026-01-10', incomeKopecks: 100_000 }), // Q1
      rawEntry({ date: '2026-05-01', incomeKopecks: 50_000 }), // Q2
      rawEntry({ date: '2026-11-01', expenseKopecks: 30_000 }), // Q4
    ]);
    const totalsByLabel = Object.fromEntries(
      entries
        .filter((entry) => entry.seq === null)
        .map((entry) => [entry.content, entry]),
    );

    expect(totalsByLabel['Итого за I квартал']).toEqual(
      expect.objectContaining({ incomeKopecks: 100_000, expenseKopecks: 0 }),
    );
    // Полугодие carries Q1+Q2, not just Q2's own 50_000.
    expect(totalsByLabel['Итого за полугодие']).toEqual(
      expect.objectContaining({ incomeKopecks: 150_000, expenseKopecks: 0 }),
    );
    // Empty Q3 leaves 9 месяцев unchanged from полугодие.
    expect(totalsByLabel['Итого за 9 месяцев']).toEqual(
      expect.objectContaining({ incomeKopecks: 150_000, expenseKopecks: 0 }),
    );
    expect(totalsByLabel['Итого за год']).toEqual(
      expect.objectContaining({
        incomeKopecks: 150_000,
        expenseKopecks: 30_000,
      }),
    );
  });

  it('sorts movement rows chronologically regardless of input order', () => {
    const { entries } = buildKudirEntries([
      rawEntry({ date: '2026-03-01', content: 'B' }),
      rawEntry({ date: '2026-01-01', content: 'A' }),
    ]);
    const movementRows = entries.filter((entry) => entry.seq !== null);

    expect(movementRows.map((row) => row.content)).toEqual(['A', 'B']);
    expect(movementRows.map((row) => row.seq)).toEqual([1, 2]);
  });

  it('breaks a same-date tie deterministically by document+content', () => {
    const { entries } = buildKudirEntries([
      rawEntry({ date: '2026-01-01', documentLabel: 'B doc', content: 'x' }),
      rawEntry({ date: '2026-01-01', documentLabel: 'A doc', content: 'x' }),
    ]);
    const movementRows = entries.filter((entry) => entry.seq !== null);

    expect(movementRows.map((row) => row.documentLabel)).toEqual([
      'A doc',
      'B doc',
    ]);
  });
});

describe('findQuantityThresholdDate', () => {
  it('returns the date of the single event that reaches the target exactly', () => {
    expect(
      findQuantityThresholdDate([{ date: '2026-02-01', quantity: 4 }], 4),
    ).toBe('2026-02-01');
  });

  it('returns null when cumulative quantity never reaches the target', () => {
    expect(
      findQuantityThresholdDate([{ date: '2026-02-01', quantity: 2 }], 4),
    ).toBeNull();
  });

  it('returns the date of the event where the running sum first crosses the target, chronologically', () => {
    const events = [
      { date: '2026-03-01', quantity: 3 }, // out of order on purpose
      { date: '2026-01-01', quantity: 2 },
      { date: '2026-02-01', quantity: 2 }, // cumulative 2+2=4 reaches target here
    ];

    expect(findQuantityThresholdDate(events, 4)).toBe('2026-02-01');
  });

  it('returns null for a non-positive target', () => {
    expect(
      findQuantityThresholdDate([{ date: '2026-01-01', quantity: 1 }], 0),
    ).toBeNull();
  });
});

describe('matchGoodsExpenseLine', () => {
  const baseInput = {
    quantity: 4,
    amountKopecks: 40_000,
    paidDate: '2026-01-10',
    receivedQtyAvailable: 10,
    receivedDate: '2026-01-05',
    soldEvents: [{ date: '2026-01-20', quantity: 4 }],
  };

  it('recognizes the expense on the LATEST of оприходован/оплачен/реализован', () => {
    const match = matchGoodsExpenseLine(baseInput);

    expect(match).toEqual({
      recognitionDate: '2026-01-20', // sale is the latest of the three dates
      amountKopecks: 40_000,
    });
  });

  it('recognizes on the payment date when that is the latest event', () => {
    const match = matchGoodsExpenseLine({
      ...baseInput,
      paidDate: '2026-02-01',
      soldEvents: [{ date: '2026-01-20', quantity: 4 }],
    });

    expect(match?.recognitionDate).toBe('2026-02-01');
  });

  it('returns null when the invoice is not (fully) paid', () => {
    expect(matchGoodsExpenseLine({ ...baseInput, paidDate: null })).toBeNull();
  });

  it('returns null when the received quantity is insufficient (не оприходован)', () => {
    expect(
      matchGoodsExpenseLine({ ...baseInput, receivedQtyAvailable: 3 }),
    ).toBeNull();
  });

  it('returns null when the item is not (fully) realized — «не реализован → нет расхода»', () => {
    expect(
      matchGoodsExpenseLine({
        ...baseInput,
        soldEvents: [{ date: '2026-01-20', quantity: 2 }], // only 2 of 4 sold
      }),
    ).toBeNull();
  });

  it('returns null when there are no sales events at all', () => {
    expect(matchGoodsExpenseLine({ ...baseInput, soldEvents: [] })).toBeNull();
  });
});
