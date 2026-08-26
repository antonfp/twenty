import {
  decodeCp1251,
  encodeCp1251,
} from 'src/engine/core-modules/erp-accounting/utils/decode-cp1251.util';

describe('decodeCp1251', () => {
  it('decodes ASCII bytes unchanged', () => {
    expect(decodeCp1251(Buffer.from('Payment 15/2026', 'latin1'))).toBe(
      'Payment 15/2026',
    );
  });

  it('decodes known CP1251 byte sequences to the correct Cyrillic text', () => {
    // П=0xCF р=0xF0 и=0xE8 в=0xE2 е=0xE5 т=0xF2
    expect(
      decodeCp1251(Buffer.from([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2])),
    ).toBe('Привет');
    // Ё=0xA8, №=0xB9
    expect(decodeCp1251(Buffer.from([0xa8, 0xb9]))).toBe('Ё№');
  });

  it('round-trips arbitrary Cyrillic company-name text through encode/decode', () => {
    const text = 'ООО "Ромашка", ИНН 7712345678, № 42';

    expect(decodeCp1251(encodeCp1251(text))).toBe(text);
  });
});
