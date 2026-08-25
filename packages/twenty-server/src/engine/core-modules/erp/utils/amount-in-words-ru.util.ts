const UNITS_MASCULINE = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];

const UNITS_FEMININE = [
  '',
  'одна',
  'две',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];

const TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
];

const TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
];

const HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
];

type DeclensionForms = readonly [one: string, few: string, many: string];

const RUBLE_FORMS: DeclensionForms = ['рубль', 'рубля', 'рублей'];
const KOPECK_FORMS: DeclensionForms = ['копейка', 'копейки', 'копеек'];

// Scale words for triads above units, lowest first; thousands take feminine
// unit words («одна тысяча», «две тысячи»).
const SCALES: readonly { forms: DeclensionForms; isFeminine: boolean }[] = [
  { forms: ['тысяча', 'тысячи', 'тысяч'], isFeminine: true },
  { forms: ['миллион', 'миллиона', 'миллионов'], isFeminine: false },
  { forms: ['миллиард', 'миллиарда', 'миллиардов'], isFeminine: false },
];

// 11–14 always take the "many" form regardless of the last digit.
const declineByNumber = (value: number, forms: DeclensionForms): string => {
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return forms[2];
  }

  const lastDigit = value % 10;

  if (lastDigit === 1) {
    return forms[0];
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[1];
  }

  return forms[2];
};

const triadToWords = (triad: number, isFeminine: boolean): string[] => {
  const words: string[] = [];
  const hundreds = Math.floor(triad / 100);
  const belowHundred = triad % 100;

  if (hundreds > 0) {
    words.push(HUNDREDS[hundreds]);
  }

  if (belowHundred >= 10 && belowHundred <= 19) {
    words.push(TEENS[belowHundred - 10]);

    return words;
  }

  const tens = Math.floor(belowHundred / 10);
  const units = belowHundred % 10;

  if (tens > 0) {
    words.push(TENS[tens]);
  }

  if (units > 0) {
    words.push(isFeminine ? UNITS_FEMININE[units] : UNITS_MASCULINE[units]);
  }

  return words;
};

// Рубли прописью, копейки цифрами, как в 1С: «Двенадцать тысяч триста сорок
// пять рублей 67 копеек». amount is in rubles (kopecks as the fraction).
export const amountInWordsRu = (amount: number): string => {
  const totalKopecks = Math.round(Math.abs(amount) * 100);
  const rubles = Math.floor(totalKopecks / 100);
  const kopecks = totalKopecks % 100;

  const words: string[] = [];

  if (rubles === 0) {
    words.push('ноль');
  } else {
    const triads: number[] = [];
    let remaining = rubles;

    while (remaining > 0) {
      triads.push(remaining % 1000);
      remaining = Math.floor(remaining / 1000);
    }

    for (let triadIndex = triads.length - 1; triadIndex >= 0; triadIndex--) {
      const triad = triads[triadIndex];

      if (triad === 0) {
        continue;
      }

      const scale = triadIndex > 0 ? SCALES[triadIndex - 1] : undefined;

      words.push(...triadToWords(triad, scale?.isFeminine ?? false));

      if (scale) {
        words.push(declineByNumber(triad, scale.forms));
      }
    }
  }

  words.push(declineByNumber(rubles, RUBLE_FORMS));
  words.push(String(kopecks).padStart(2, '0'));
  words.push(declineByNumber(kopecks, KOPECK_FORMS));

  const sentence = words.join(' ');

  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};
