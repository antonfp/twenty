import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

export type PartyLedgerDirection = 'AR' | 'AP';

// Взаиморасчёты (партионный регистр). Amount is signed: positive increases the
// party's debt in the given direction, negative decreases it.
export type PartyLedgerEntryInput = {
  partyId: string;
  voucherType: string;
  voucherId: string;
  direction: PartyLedgerDirection;
  amount: number;
  postingDate: string;
};

export type GlEntryInput = {
  account: string;
  debit: number;
  credit: number;
  partyId?: string;
  voucherType: string;
  voucherId: string;
  postingDate: string;
};

// actualQty is signed: positive = приход, negative = расход.
export type StockLedgerEntryInput = {
  itemId: string;
  warehouseId: string;
  actualQty: number;
  voucherType: string;
  voucherId: string;
  postingTs: string;
};

export type ErpDocumentRecord = Record<string, unknown> & { id: string };

export type ErpDocumentLineRecord = Record<string, unknown> & { id: string };

export type PostingContext = {
  workspaceId: string;
  documentObjectName: string;
  documentId: string;
  postingDate: string;
  transactionScope: WorkspaceTransactionScope;
};

export type PostingRulesProvider = {
  validate?: (
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ) => Promise<void> | void;
  getPartyEntries?: (
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ) => Promise<PartyLedgerEntryInput[]> | PartyLedgerEntryInput[];
  getStockEntries?: (
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ) => Promise<StockLedgerEntryInput[]> | StockLedgerEntryInput[];
  getGlEntries?: (
    context: PostingContext,
    document: ErpDocumentRecord,
    lines: ErpDocumentLineRecord[],
  ) => Promise<GlEntryInput[]> | GlEntryInput[];
  // Runs inside the cancel transaction after register reversal rows are
  // written — for side effects the reversal itself can't express (e.g. a
  // payment rolling back the linked invoice's paid status).
  onCancel?: (
    context: PostingContext,
    document: ErpDocumentRecord,
  ) => Promise<void> | void;
};
