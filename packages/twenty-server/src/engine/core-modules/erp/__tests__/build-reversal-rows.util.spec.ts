import { buildReversalRows } from 'src/engine/core-modules/erp/utils/build-reversal-rows.util';

describe('buildReversalRows', () => {
  it('negates measure fields and flags the row as a cancellation', () => {
    const [reversalRow] = buildReversalRows([
      {
        id: 'row-1',
        partyId: 'party-1',
        voucherType: 'salesInvoice',
        voucherId: 'voucher-1',
        direction: 'AR',
        amount: 150.5,
        postingDate: '2026-01-15',
        isCancellation: false,
        isCancelled: false,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-15T10:00:00.000Z',
        deletedAt: null,
      },
    ]);

    expect(reversalRow).toEqual({
      partyId: 'party-1',
      voucherType: 'salesInvoice',
      voucherId: 'voucher-1',
      direction: 'AR',
      amount: -150.5,
      postingDate: '2026-01-15',
      isCancellation: true,
      isCancelled: false,
    });
  });

  it('negates debit, credit and actualQty', () => {
    const [reversalRow] = buildReversalRows([
      { id: 'row-1', debit: 100, credit: 0, actualQty: -3 },
    ]);

    expect(reversalRow).toEqual({
      debit: -100,
      credit: -0,
      actualQty: 3,
      isCancellation: true,
      isCancelled: false,
    });
  });

  it('negates stockValueDiff but not valuationRate or qtyAfter', () => {
    const [reversalRow] = buildReversalRows([
      {
        id: 'row-1',
        actualQty: 5,
        qtyAfter: 12,
        stockValueDiff: { amountMicros: 5_000_000, currencyCode: 'RUB' },
        valuationRate: { amountMicros: 1_000_000, currencyCode: 'RUB' },
      },
    ]);

    expect(reversalRow).toEqual({
      actualQty: -5,
      qtyAfter: 12,
      stockValueDiff: { amountMicros: -5_000_000, currencyCode: 'RUB' },
      valuationRate: { amountMicros: 1_000_000, currencyCode: 'RUB' },
      isCancellation: true,
      isCancelled: false,
    });
  });

  it('builds one reversal per original row', () => {
    const reversalRows = buildReversalRows([
      { id: 'row-1', amount: 10 },
      { id: 'row-2', amount: 20 },
    ]);

    expect(reversalRows).toHaveLength(2);
    expect(reversalRows.map((reversalRow) => reversalRow.amount)).toEqual([
      -10, -20,
    ]);
    expect(
      reversalRows.every((reversalRow) => !('id' in reversalRow)),
    ).toBe(true);
  });
});

describe('buildReversalRows currency composites', () => {
  it('negates CURRENCY composite measures', () => {
    const [row] = buildReversalRows([
      {
        amount: { amountMicros: '90000000000', currencyCode: 'RUB' },
        companyId: 'c1',
      },
    ]);

    expect(row.amount).toEqual({
      amountMicros: '-90000000000',
      currencyCode: 'RUB',
    });
    expect(row.companyId).toBe('c1');
    expect(row.isCancellation).toBe(true);
  });

  it('negates flattened amountMicros columns, both string and number', () => {
    const [row] = buildReversalRows([
      { amountAmountMicros: '40000000000', creditAmountMicros: 250 },
    ]);

    expect(row.amountAmountMicros).toBe('-40000000000');
    expect(row.creditAmountMicros).toBe(-250);
  });

  it('keeps negative composite negation symmetric', () => {
    const [row] = buildReversalRows([
      { amount: { amountMicros: -5000, currencyCode: 'RUB' } },
    ]);

    expect(row.amount).toEqual({ amountMicros: 5000, currencyCode: 'RUB' });
  });
});
