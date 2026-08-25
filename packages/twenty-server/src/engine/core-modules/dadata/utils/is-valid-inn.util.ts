// Standard Russian INN checksum weights (ФНС algorithm): 10-digit legal-entity
// INNs carry one check digit, 12-digit individual INNs carry two.
const INN_10_CHECK_DIGIT_WEIGHTS = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_12_FIRST_CHECK_DIGIT_WEIGHTS = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_12_SECOND_CHECK_DIGIT_WEIGHTS = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

const computeInnCheckDigit = (digits: number[], weights: number[]): number =>
  (weights.reduce((sum, weight, index) => sum + weight * digits[index], 0) %
    11) %
  10;

export const isValidInn = (inn: string): boolean => {
  if (!/^(\d{10}|\d{12})$/.test(inn)) {
    return false;
  }

  const digits = inn.split('').map(Number);

  if (digits.length === 10) {
    return computeInnCheckDigit(digits, INN_10_CHECK_DIGIT_WEIGHTS) === digits[9];
  }

  return (
    computeInnCheckDigit(digits, INN_12_FIRST_CHECK_DIGIT_WEIGHTS) ===
      digits[10] &&
    computeInnCheckDigit(digits, INN_12_SECOND_CHECK_DIGIT_WEIGHTS) ===
      digits[11]
  );
};
