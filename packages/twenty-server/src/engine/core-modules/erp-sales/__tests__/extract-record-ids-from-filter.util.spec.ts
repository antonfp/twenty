import { extractRecordIdsFromFilter } from 'src/engine/core-modules/erp-sales/utils/extract-record-ids-from-filter.util';

describe('extractRecordIdsFromFilter', () => {
  it('extracts a single id from eq', () => {
    expect(extractRecordIdsFromFilter({ id: { eq: 'a' } })).toEqual(['a']);
  });

  it('extracts ids from in', () => {
    expect(extractRecordIdsFromFilter({ id: { in: ['a', 'b'] } })).toEqual([
      'a',
      'b',
    ]);
  });

  it('finds a bounded branch inside and', () => {
    expect(
      extractRecordIdsFromFilter({
        and: [{ name: { eq: 'x' } }, { id: { in: ['a'] } }],
      }),
    ).toEqual(['a']);
  });

  it('unions or branches when all are bounded', () => {
    expect(
      extractRecordIdsFromFilter({
        or: [{ id: { eq: 'a' } }, { id: { eq: 'b' } }],
      }),
    ).toEqual(['a', 'b']);
  });

  it('returns undefined when an or branch is unbounded', () => {
    expect(
      extractRecordIdsFromFilter({
        or: [{ id: { eq: 'a' } }, { name: { eq: 'x' } }],
      }),
    ).toBeUndefined();
  });

  it('returns undefined for non-id filters and empty input', () => {
    expect(extractRecordIdsFromFilter({ name: { eq: 'x' } })).toBeUndefined();
    expect(extractRecordIdsFromFilter(undefined)).toBeUndefined();
    expect(extractRecordIdsFromFilter(null)).toBeUndefined();
  });
});
