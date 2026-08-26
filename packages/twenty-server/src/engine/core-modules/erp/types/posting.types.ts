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

// Row shape of the glEntry register object installed by the erp-accounting
// app. Ruling: парная проводка 1С-семантики — debitAccount + creditAccount +
// amount в одной строке, поэтому баланс Σдт=Σкт выполняется по построению и
// buildReversalRows-сторно (негация amount) работает из коробки.
export type ErpGlEntryRow = {
  name: string;
  date: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: { amountMicros: number; currencyCode: string };
  organizationId: string | null;
  partyId?: string | null;
  itemId?: string | null;
  voucherType: string;
  voucherId: string;
  isCancelled: boolean;
  isCancellation: boolean;
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
  // Runs inside the cancel transaction after register reversal rows are
  // written — for side effects the reversal itself can't express (e.g. a
  // payment rolling back the linked invoice's paid status).
  onCancel?: (
    context: PostingContext,
    document: ErpDocumentRecord,
  ) => Promise<void> | void;
};

// Glue-архитектура GL (ruling): автопроводки живут в erp-accounting как
// контрибьюторы, а не в блоках-владельцах документов. Runs after the main
// providers wrote their registers and document totals, on a re-read document.
export type GlContributor = (
  context: PostingContext,
  document: ErpDocumentRecord,
  lines: ErpDocumentLineRecord[],
) => Promise<ErpGlEntryRow[]> | ErpGlEntryRow[];
