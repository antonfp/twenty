// Windows-1251 (Cyrillic) byte→codepoint table for 0x80-0xFF, transcribed
// from unicode.org's CP1251.TXT (https://unicode.org/Public/MAPPINGS/VENDORS/MICSFT/WINDOWS/CP1251.TXT).
// iconv-lite is not a twenty-server dependency (checked package.json before
// adding this), so bank-statement-import hand-rolls the fixed mapping
// instead of adding one. 0x00-0x7F is ASCII-identical and decoded directly;
// 0x98 has no assigned character in CP1251 (replacement char).
const CP1251_HIGH_HALF =
  'ЂЃ‚ѓ„…†‡€‰Љ‹ЊЌЋЏ' +
  'ђ‘’“”•–—�™љ›њќћџ' +
  ' ЎўЈ¤Ґ¦§Ё©Є«¬­®Ї' +
  '°±Ііґµ¶·ё№є»јЅѕї' +
  'АБВГДЕЖЗИЙКЛМНОП' +
  'РСТУФХЦЧШЩЪЫЬЭЮЯ' +
  'абвгдежзийклмноп' +
  'рстуфхцчшщъыьэюя';

export const decodeCp1251 = (buffer: Buffer): string => {
  const chars = new Array<string>(buffer.length);

  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index];

    chars[index] =
      byte < 0x80 ? String.fromCharCode(byte) : CP1251_HIGH_HALF[byte - 0x80];
  }

  return chars.join('');
};

const CP1251_BYTE_BY_CHAR = new Map<string, number>();

for (let byte = 0; byte < 0x80; byte += 1) {
  CP1251_BYTE_BY_CHAR.set(String.fromCharCode(byte), byte);
}
for (let index = 0; index < CP1251_HIGH_HALF.length; index += 1) {
  CP1251_BYTE_BY_CHAR.set(CP1251_HIGH_HALF[index], 0x80 + index);
}

// Inverse of decodeCp1251. Production code only ever needs to decode
// incoming bank exports, but building a realistic CP1251 fixture buffer for
// tests needs the inverse map — kept here so it can't drift from the table.
export const encodeCp1251 = (text: string): Buffer => {
  const bytes = Uint8Array.from(text, (char) => {
    const byte = CP1251_BYTE_BY_CHAR.get(char);

    if (byte === undefined) {
      throw new Error(`Character "${char}" has no CP1251 encoding`);
    }

    return byte;
  });

  return Buffer.from(bytes);
};
