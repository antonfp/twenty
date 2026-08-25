import { isValidInn } from 'src/engine/core-modules/dadata/utils/is-valid-inn.util';

describe('isValidInn', () => {
  it('accepts a valid 10-digit legal-entity INN', () => {
    expect(isValidInn('7707083893')).toBe(true);
    expect(isValidInn('7736050003')).toBe(true);
  });

  it('accepts a valid 12-digit individual INN', () => {
    expect(isValidInn('500100732259')).toBe(true);
  });

  it('rejects an INN with an invalid checksum', () => {
    expect(isValidInn('7707083894')).toBe(false);
    expect(isValidInn('500100732258')).toBe(false);
    expect(isValidInn('500100732249')).toBe(false);
  });

  it('rejects an INN with an invalid length', () => {
    expect(isValidInn('')).toBe(false);
    expect(isValidInn('123456789')).toBe(false);
    expect(isValidInn('77070838931')).toBe(false);
    expect(isValidInn('5001007322590')).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(isValidInn('77070838ab')).toBe(false);
    expect(isValidInn('7707-083893')).toBe(false);
    expect(isValidInn(' 7707083893')).toBe(false);
  });
});
