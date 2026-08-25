import { ERP_POSTING_EXCEPTION_CODE } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type GlEntryInput } from 'src/engine/core-modules/erp/types/posting.types';
import { assertGlEntriesBalanced } from 'src/engine/core-modules/erp/utils/assert-gl-entries-balanced.util';

const buildGlEntry = (debit: number, credit: number): GlEntryInput => ({
  account: '62.01',
  debit,
  credit,
  voucherType: 'salesInvoice',
  voucherId: 'voucher-1',
  postingDate: '2026-01-15',
});

describe('assertGlEntriesBalanced', () => {
  it('accepts an empty entry list', () => {
    expect(() => assertGlEntriesBalanced([])).not.toThrow();
  });

  it('accepts balanced entries', () => {
    expect(() =>
      assertGlEntriesBalanced([
        buildGlEntry(1000, 0),
        buildGlEntry(500, 0),
        buildGlEntry(0, 1500),
      ]),
    ).not.toThrow();
  });

  it('accepts entries balanced up to float rounding noise', () => {
    expect(() =>
      assertGlEntriesBalanced([
        buildGlEntry(0.1, 0),
        buildGlEntry(0.2, 0),
        buildGlEntry(0, 0.3),
      ]),
    ).not.toThrow();
  });

  it('rejects unbalanced entries with UNBALANCED_GL_ENTRIES', () => {
    expect(() =>
      assertGlEntriesBalanced([buildGlEntry(1000, 0), buildGlEntry(0, 999)]),
    ).toThrow(
      expect.objectContaining({
        code: ERP_POSTING_EXCEPTION_CODE.UNBALANCED_GL_ENTRIES,
      }),
    );
  });
});
