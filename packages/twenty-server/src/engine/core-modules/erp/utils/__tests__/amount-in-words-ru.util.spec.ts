import { amountInWordsRu } from 'src/engine/core-modules/erp/utils/amount-in-words-ru.util';

describe('amountInWordsRu', () => {
  // Test cases from docs/erp-design/schet-spec.md §4
  it.each([
    [12345.67, 'Двенадцать тысяч триста сорок пять рублей 67 копеек'],
    [108000, 'Сто восемь тысяч рублей 00 копеек'],
    [1001.05, 'Одна тысяча один рубль 05 копеек'],
    [2000000, 'Два миллиона рублей 00 копеек'],
    [341212, 'Триста сорок одна тысяча двести двенадцать рублей 00 копеек'],
    [0.5, 'Ноль рублей 50 копеек'],
    [21, 'Двадцать один рубль 00 копеек'],
  ])('formats %s per the schet-spec table', (amount, expected) => {
    expect(amountInWordsRu(amount)).toBe(expected);
  });

  it('uses the "many" form for 11-14 in any position', () => {
    expect(amountInWordsRu(111)).toBe('Сто одиннадцать рублей 00 копеек');
    expect(amountInWordsRu(12000)).toBe('Двенадцать тысяч рублей 00 копеек');
    expect(amountInWordsRu(1.12)).toBe('Один рубль 12 копеек');
  });

  it('skips empty triads without emitting the scale word', () => {
    expect(amountInWordsRu(1000001)).toBe('Один миллион один рубль 00 копеек');
  });

  it('declines kopecks even though they are printed as digits', () => {
    expect(amountInWordsRu(0.01)).toBe('Ноль рублей 01 копейка');
    expect(amountInWordsRu(0.03)).toBe('Ноль рублей 03 копейки');
  });

  it('handles zero', () => {
    expect(amountInWordsRu(0)).toBe('Ноль рублей 00 копеек');
  });

  it('survives float artifacts from kopeck arithmetic', () => {
    // 0.1 + 0.2 style artifacts must not shift the kopecks
    expect(amountInWordsRu(19.99)).toBe('Девятнадцать рублей 99 копеек');
  });
});
