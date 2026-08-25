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
