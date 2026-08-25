// Twenty CURRENCY fields are composite: repositories read/write them as a
// nested object that twenty-orm flattens to `<field>AmountMicros` /
// `<field>CurrencyCode` columns (1 ruble = 1_000_000 micros).
export type CurrencyFieldValue = {
  amountMicros?: number | string | null;
  currencyCode?: string | null;
} | null;

export const VAT_RATE = {
  VAT_20: 'VAT_20',
  VAT_10: 'VAT_10',
  VAT_0: 'VAT_0',
  NO_VAT: 'NO_VAT',
} as const;

export type VatRate = (typeof VAT_RATE)[keyof typeof VAT_RATE];

export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Row shape of the partyLedgerEntry register object installed by the ERP
// sales app. The core PartyLedgerEntryInput type (partyId/direction) predates
// this register contract; PostingService inserts provider rows verbatim, so
// providers return this shape and cast at the contract boundary.
export type ErpPartyLedgerEntryRow = {
  name: string;
  companyId: string | null;
  organizationId: string | null;
  voucherType: string;
  voucherId: string;
  amount: CurrencyFieldValue;
  postingDate: string;
  isCancelled: boolean;
  isCancellation: boolean;
};
