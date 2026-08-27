const RU_MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const NON_BREAKING_SPACE = ' ';

const toDateParts = (
  isoDate: string,
): { day: number; monthIndex: number; year: number } => {
  const date = new Date(isoDate);

  return {
    day: date.getUTCDate(),
    monthIndex: date.getUTCMonth(),
    year: date.getUTCFullYear(),
  };
};

export const formatDateRuShort = (isoDate: string): string => {
  const { day, monthIndex, year } = toDateParts(isoDate);

  return `${String(day).padStart(2, '0')}.${String(monthIndex + 1).padStart(2, '0')}.${year}`;
};

// «25 августа 2026 г.» — заголовок печатного счёта.
export const formatDateRuLong = (isoDate: string): string => {
  const { day, monthIndex, year } = toDateParts(isoDate);

  return `${day} ${RU_MONTHS_GENITIVE[monthIndex]} ${year} г.`;
};

// 1 234 567,89 — разряды через неразрывный пробел, запятая-разделитель.
export const formatMoneyRu = (kopecks: number): string => {
  const sign = kopecks < 0 ? '-' : '';
  const absoluteKopecks = Math.abs(kopecks);
  const rubles = Math.floor(absoluteKopecks / 100);
  const fraction = String(absoluteKopecks % 100).padStart(2, '0');
  const groupedRubles = String(rubles).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    NON_BREAKING_SPACE,
  );

  return `${sign}${groupedRubles},${fraction}`;
};

// Quantity: up to 3 decimals, trailing zeros trimmed, comma separator.
export const formatQuantityRu = (quantity: number): string => {
  const rounded = Math.round(quantity * 1000) / 1000;
  const [integerPart, fractionPart] = String(rounded).split('.');
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    NON_BREAKING_SPACE,
  );

  return fractionPart ? `${groupedInteger},${fractionPart}` : groupedInteger;
};

// 1 000 руб. in kopecks — the unit balance-sheet.service.ts/
// income-statement.service.ts round to for printing (ФСБУ 4/2023 Приложение
// № 9: «в тыс. руб., без десятичных знаков» — see balance-spec.md §…
// «Округление»).
const THOUSAND_ROUBLE_KOPECKS = 100_000;

// Half-to-even (banker's rounding) — ruling «банковское округление строк»
// (docs/plans/phase9-accounting-depth.md). Done in the integer kopecks
// domain (not `kopecks / 100_000` in floating point) so an exact .5 case
// never slips past IEEE-754 drift before the tie-break runs.
export const roundKopecksToThousandRoubles = (kopecks: number): number => {
  const sign = kopecks < 0 ? -1 : 1;
  const absoluteKopecks = Math.abs(kopecks);
  const quotient = Math.floor(absoluteKopecks / THOUSAND_ROUBLE_KOPECKS);
  const remainder = absoluteKopecks % THOUSAND_ROUBLE_KOPECKS;
  const doubledRemainder = remainder * 2;
  const roundedThousands =
    doubledRemainder < THOUSAND_ROUBLE_KOPECKS
      ? quotient
      : doubledRemainder > THOUSAND_ROUBLE_KOPECKS
        ? quotient + 1
        : quotient % 2 === 0 // Exact half: round to the even neighbour.
          ? quotient
          : quotient + 1;

  // `sign * 0` is -0 for a negative input rounding to zero — normalize so
  // callers (and Object.is-based test assertions) never see a signed zero.
  return sign * roundedThousands || 0;
};

// «7 620» — thousands of roubles, integer, grouped, no fraction. Zero is the
// caller's job to special-case as «—» (see render-balance-sheet-html.util.ts)
// — this formatter always prints a number, matching formatMoneyRu's totals-row
// convention rather than the trial-balance zero-cell-blank one.
export const formatThousandRoublesRu = (kopecks: number): string => {
  const roundedThousands = roundKopecksToThousandRoubles(kopecks);
  const sign = roundedThousands < 0 ? '-' : '';
  const grouped = String(Math.abs(roundedThousands)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    NON_BREAKING_SPACE,
  );

  return `${sign}${grouped}`;
};

// «7 620» — целые рубли КУДиР (research §2: приказ ФНС ЕА-7-3/816@, «книга
// ведётся в рублях, без копеек»). Обычное арифметическое округление
// (Math.round — половина копейки уходит вверх), НЕ банковское/до тысяч —
// то отдельное правило ФСБУ 4/2023 для баланса/ОФР выше, здесь другая форма
// с другим документально закреплённым способом округления.
export const formatWholeRublesRu = (kopecks: number): string => {
  const roubles = Math.round(Math.abs(kopecks) / 100);
  const sign = kopecks < 0 && roubles !== 0 ? '-' : '';
  const grouped = String(roubles).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    NON_BREAKING_SPACE,
  );

  return `${sign}${grouped}`;
};
