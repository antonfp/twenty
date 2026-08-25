// Register objects are installed with their ERP block (Phase 2); the posting
// service only touches the ones present in the workspace metadata.
export const ERP_REGISTER_OBJECT_NAMES = {
  PARTY_LEDGER_ENTRY: 'partyLedgerEntry',
  STOCK_LEDGER_ENTRY: 'stockLedgerEntry',
  GL_ENTRY: 'glEntry',
} as const;

export const ALL_ERP_REGISTER_OBJECT_NAMES: readonly string[] = [
  ERP_REGISTER_OBJECT_NAMES.PARTY_LEDGER_ENTRY,
  ERP_REGISTER_OBJECT_NAMES.STOCK_LEDGER_ENTRY,
  ERP_REGISTER_OBJECT_NAMES.GL_ENTRY,
];
