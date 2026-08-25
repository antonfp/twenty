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
