// Карточка счёта (Task 2, Фаза 9) — pure aggregation/presentation layer, same
// split as compute-trial-balance.util.ts: the by-kind balance rule
// (presentNetByKind) is reused as-is, so ОСВ and карточка счёта can never
// drift on how a signed net becomes a Дт/Кт pair.
import {
  presentNetByKind,
  type TrialBalanceAccountKind,
} from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';

export type { TrialBalanceAccountKind as AccountCardAccountKind } from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';

export type AccountCardOpeningAggregate = {
  openingDebitKopecks: number;
  openingCreditKopecks: number;
};

// One leg (one side of one glEntry row) touching the card's account, as
// fetched by the caller's SQL (two-legs UNION ALL, same shape as
// trial-balance's aggregate query, but un-aggregated — every row prints).
export type RawAccountCardLeg = {
  glEntryId: string;
  date: string;
  isDebit: boolean;
  amountKopecks: number;
  // null when the corresponding account's FK was SET_NULL (its план счетов
  // row got deleted after posting) — see osv-spec.md §3.3's same caveat.
  correspondingAccountId: string | null;
  voucherType: string | null;
  voucherId: string | null;
};

export type AccountCardRow = {
  glEntryId: string;
  date: string;
  correspondingAccountId: string | null;
  debitKopecks: number;
  creditKopecks: number;
  runningBalanceDebitKopecks: number;
  runningBalanceCreditKopecks: number;
  voucherType: string | null;
  voucherId: string | null;
};

// Enrichment added by the service (corresponding account's code, resolved
// document label) — declared here rather than in account-card.service.ts so
// render-account-card-html.util.ts can import it without a service<->render
// circular import (same reason AccountMasterInfo lives in
// compute-trial-balance.util.ts, not trial-balance.service.ts).
export type AccountCardDocumentRow = AccountCardRow & {
  correspondingAccountCode: string;
  documentLabel: string;
};

export type PresentedBalance = { debitKopecks: number; creditKopecks: number };

export type AccountCardComputation = {
  openingBalance: PresentedBalance;
  rows: AccountCardRow[];
  closingBalance: PresentedBalance;
  totalDebitKopecks: number;
  totalCreditKopecks: number;
};

// Ruling («сальдо нарастающим итогом»): running net starts at the opening
// net and accumulates debit−credit leg by leg, in the caller-supplied
// (chronological) order — each row's printed balance is presentNetByKind
// applied to that running net, exactly like opening/closing. legs must
// already be sorted by (date, insertion order); this function does not sort.
export const computeAccountCardRows = (
  legs: RawAccountCardLeg[],
  opening: AccountCardOpeningAggregate,
  kind: TrialBalanceAccountKind,
): AccountCardComputation => {
  const openingNetKopecks =
    opening.openingDebitKopecks - opening.openingCreditKopecks;
  let runningNetKopecks = openingNetKopecks;
  let totalDebitKopecks = 0;
  let totalCreditKopecks = 0;

  const rows: AccountCardRow[] = legs.map((leg) => {
    const debitKopecks = leg.isDebit ? leg.amountKopecks : 0;
    const creditKopecks = leg.isDebit ? 0 : leg.amountKopecks;

    runningNetKopecks += debitKopecks - creditKopecks;
    totalDebitKopecks += debitKopecks;
    totalCreditKopecks += creditKopecks;

    const runningBalance = presentNetByKind(runningNetKopecks, kind);

    return {
      glEntryId: leg.glEntryId,
      date: leg.date,
      correspondingAccountId: leg.correspondingAccountId,
      debitKopecks,
      creditKopecks,
      runningBalanceDebitKopecks: runningBalance.debitKopecks,
      runningBalanceCreditKopecks: runningBalance.creditKopecks,
      voucherType: leg.voucherType,
      voucherId: leg.voucherId,
    };
  });

  return {
    openingBalance: presentNetByKind(openingNetKopecks, kind),
    rows,
    closingBalance: presentNetByKind(runningNetKopecks, kind),
    totalDebitKopecks,
    totalCreditKopecks,
  };
};
