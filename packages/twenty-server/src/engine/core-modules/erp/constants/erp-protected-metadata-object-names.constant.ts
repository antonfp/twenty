// Metadata-frontier register list (Phase 8 T2). Deliberately NOT the same
// list as ALL_ERP_REGISTER_OBJECT_NAMES (erp-register-object-names.constant.ts),
// which is scoped to posting.service.ts's cancellation reversal loop — that
// loop queries voucherType/voucherId/isCancellation columns that itemBalance
// does not have (it's an upsert-in-place balance snapshot, not a voucher
// ledger, see item-balance.service.ts). Adding itemBalance there would break
// cancellation, not fix a gap. This list is for the AI-customization guard
// only (ErpMetadataToolGuardService): no field, view, or metadata mutation
// may ever target these 4 objects, regardless of custom/app-owned status.
export const ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES: readonly string[] = [
  'partyLedgerEntry',
  'stockLedgerEntry',
  'itemBalance',
  'glEntry',
];
