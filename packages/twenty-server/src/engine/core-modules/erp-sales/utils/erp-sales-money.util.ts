import { isDefined } from 'twenty-shared/utils';

import {
  type CurrencyFieldValue,
  type VatRate,
} from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

// All document math runs in integer kopecks to keep kopeck precision
// (1 kopeck = 10_000 micros).
const MICROS_PER_KOPECK = 10_000;

export const RUB_CURRENCY_CODE = 'RUB';

export const currencyToKopecks = (value: CurrencyFieldValue): number => {
  if (!isDefined(value) || !isDefined(value.amountMicros)) {
    return 0;
  }

  return Math.round(Number(value.amountMicros) / MICROS_PER_KOPECK);
};

export const kopecksToCurrency = (
  kopecks: number,
  currencyCode: string = RUB_CURRENCY_CODE,
): { amountMicros: number; currencyCode: string } => {
  return { amountMicros: kopecks * MICROS_PER_KOPECK, currencyCode };
};

export const kopecksToRubles = (kopecks: number): number => {
  return kopecks / 100;
};

const VAT_RATE_PERCENT: Record<VatRate, number> = {
  VAT_20: 20,
  VAT_10: 10,
  VAT_0: 0,
  NO_VAT: 0,
};

export const vatRatePercent = (vatRate: string | null | undefined): number => {
  return VAT_RATE_PERCENT[vatRate as VatRate] ?? 0;
};

// НДС в цене: vat = amount × rate / (100 + rate), rounded half away from
// zero to kopecks (amounts are non-negative, so Math.round matches 1С).
export const computeVatInAmountKopecks = (
  amountKopecks: number,
  vatRate: string | null | undefined,
): number => {
  const ratePercent = vatRatePercent(vatRate);

  if (ratePercent === 0) {
    return 0;
  }

  return Math.round((amountKopecks * ratePercent) / (100 + ratePercent));
};

export const computeLineAmountKopecks = (
  quantity: number,
  priceKopecks: number,
): number => {
  return Math.round(quantity * priceKopecks);
};
