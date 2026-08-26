import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

// Row shape of the stockLedgerEntry register object installed by the ERP
// stock app. The core StockLedgerEntryInput type predates this register
// contract; PostingService inserts provider rows verbatim, so providers
// return this shape and cast at the contract boundary (same convention as
// ErpPartyLedgerEntryRow in erp-sales).
export type ErpStockLedgerEntryRow = {
  name: string;
  itemId: string;
  warehouseId: string;
  organizationId: string | null;
  actualQty: number;
  qtyAfter: number;
  valuationRate: CurrencyFieldValue;
  stockValueDiff: CurrencyFieldValue;
  voucherType: string;
  voucherId: string;
  isCancelled: boolean;
  isCancellation: boolean;
};
