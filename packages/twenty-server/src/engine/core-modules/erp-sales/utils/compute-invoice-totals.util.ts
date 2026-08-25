import { type ErpDocumentLineRecord } from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  computeLineAmountKopecks,
  computeVatInAmountKopecks,
  currencyToKopecks,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';

export type ComputedInvoiceLine = {
  line: ErpDocumentLineRecord;
  amountKopecks: number;
  vatKopecks: number;
  vatRate: string | null;
};

export type ComputedInvoiceTotals = {
  computedLines: ComputedInvoiceLine[];
  totalKopecks: number;
  vatTotalKopecks: number;
};

// Line amount = quantity × price, VAT extracted from the amount (НДС в цене),
// everything rounded to kopecks per line before summing — the 1С convention.
export const computeInvoiceTotals = (
  lines: ErpDocumentLineRecord[],
): ComputedInvoiceTotals => {
  const computedLines = lines.map((line) => {
    const quantity = Number(line.quantity ?? 0);
    const priceKopecks = currencyToKopecks(line.price as CurrencyFieldValue);
    const amountKopecks = computeLineAmountKopecks(quantity, priceKopecks);
    const vatRate = typeof line.vatRate === 'string' ? line.vatRate : null;
    const vatKopecks = computeVatInAmountKopecks(amountKopecks, vatRate);

    return { line, amountKopecks, vatKopecks, vatRate };
  });

  return {
    computedLines,
    totalKopecks: computedLines.reduce(
      (sum, computedLine) => sum + computedLine.amountKopecks,
      0,
    ),
    vatTotalKopecks: computedLines.reduce(
      (sum, computedLine) => sum + computedLine.vatKopecks,
      0,
    ),
  };
};
