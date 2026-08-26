// ОСВ (оборотно-сальдовая ведомость) — pure aggregation/presentation layer,
// deliberately separated from the SQL fetch (trial-balance.service.ts) so the
// by-kind balance rules are unit-testable without a database.
export type TrialBalanceAccountKind = 'ACTIVE' | 'PASSIVE' | 'ACTIVE_PASSIVE';

// One account's raw legs summed by the caller's SQL: opening = Σ до dateFrom,
// turnover = Σ за [dateFrom, dateTo]. Ruling: sums include reversal rows as
// ordinary legs (isCancellation rows carry a negated amount) — сторно
// нейтрализует оригинал by plain summation, no filtering needed.
export type RawAccountLegAggregate = {
  accountId: string;
  openingDebitKopecks: number;
  openingCreditKopecks: number;
  turnoverDebitKopecks: number;
  turnoverCreditKopecks: number;
};

export type AccountMasterInfo = {
  code: string;
  name: string;
  kind: TrialBalanceAccountKind;
};

export type TrialBalanceRow = {
  accountId: string;
  code: string;
  name: string;
  openingDebitKopecks: number;
  openingCreditKopecks: number;
  turnoverDebitKopecks: number;
  turnoverCreditKopecks: number;
  closingDebitKopecks: number;
  closingCreditKopecks: number;
};

export type TrialBalanceTotals = {
  openingDebitKopecks: number;
  openingCreditKopecks: number;
  turnoverDebitKopecks: number;
  turnoverCreditKopecks: number;
  closingDebitKopecks: number;
  closingCreditKopecks: number;
};

const ZERO_TOTALS: TrialBalanceTotals = {
  openingDebitKopecks: 0,
  openingCreditKopecks: 0,
  turnoverDebitKopecks: 0,
  turnoverCreditKopecks: 0,
  closingDebitKopecks: 0,
  closingCreditKopecks: 0,
};

// Ruling («сальдо presentation by kind»): ACTIVE keeps the net in Дт
// (negative net prints as a minus in Дт — 1С «красное сторно», simplified);
// PASSIVE is the mirror in Кт; ACTIVE_PASSIVE («развёрнуто») moves the whole
// balance to the side matching its sign — positive net → Дт only, negative →
// its absolute value in Кт only (never a minus sign, unlike ACTIVE/PASSIVE).
const presentNetByKind = (
  netKopecks: number,
  kind: TrialBalanceAccountKind,
): { debitKopecks: number; creditKopecks: number } => {
  if (kind === 'PASSIVE') {
    return { debitKopecks: 0, creditKopecks: -netKopecks };
  }

  if (kind === 'ACTIVE_PASSIVE') {
    return netKopecks >= 0
      ? { debitKopecks: netKopecks, creditKopecks: 0 }
      : { debitKopecks: 0, creditKopecks: -netKopecks };
  }

  return { debitKopecks: netKopecks, creditKopecks: 0 };
};

// 1С-style code sort: numeric leading segment first ("2" before "10"), then
// remaining dotted segments compared the same way — matches the seeded plan
// of accounts ("01".."99", "90.01.1") without relying on zero-padding.
const compareAccountCodes = (codeA: string, codeB: string): number => {
  const segmentsA = codeA.split('.');
  const segmentsB = codeB.split('.');
  const length = Math.max(segmentsA.length, segmentsB.length);

  for (let index = 0; index < length; index += 1) {
    const segmentA = segmentsA[index] ?? '';
    const segmentB = segmentsB[index] ?? '';
    const numberA = Number(segmentA);
    const numberB = Number(segmentB);

    if (
      segmentA !== '' &&
      segmentB !== '' &&
      !Number.isNaN(numberA) &&
      !Number.isNaN(numberB) &&
      numberA !== numberB
    ) {
      return numberA - numberB;
    }

    if (segmentA !== segmentB) {
      return segmentA < segmentB ? -1 : 1;
    }
  }

  return 0;
};

// Accounts referenced by glEntry but absent from the (user-editable) план
// счетов — e.g. deleted after posting — still print: code falls back to the
// raw accountId («show code as is»), kind defaults to the safest
// presentation (развёрнуто) rather than silently guessing a side.
const FALLBACK_ACCOUNT_KIND: TrialBalanceAccountKind = 'ACTIVE_PASSIVE';

export const computeTrialBalanceRows = (
  aggregates: RawAccountLegAggregate[],
  accountsById: Map<string, AccountMasterInfo>,
): { rows: TrialBalanceRow[]; totals: TrialBalanceTotals } => {
  const rows: TrialBalanceRow[] = [];

  for (const aggregate of aggregates) {
    const openingNetKopecks =
      aggregate.openingDebitKopecks - aggregate.openingCreditKopecks;

    // Omit accounts with no period turnover and a zero opening (⇒ zero
    // closing too) — ruling «Accounts with no movements and zero balances».
    if (
      aggregate.turnoverDebitKopecks === 0 &&
      aggregate.turnoverCreditKopecks === 0 &&
      openingNetKopecks === 0
    ) {
      continue;
    }

    const closingNetKopecks =
      openingNetKopecks +
      aggregate.turnoverDebitKopecks -
      aggregate.turnoverCreditKopecks;

    const account = accountsById.get(aggregate.accountId);
    const kind = account?.kind ?? FALLBACK_ACCOUNT_KIND;
    const opening = presentNetByKind(openingNetKopecks, kind);
    const closing = presentNetByKind(closingNetKopecks, kind);

    rows.push({
      accountId: aggregate.accountId,
      code: account?.code ?? aggregate.accountId,
      name: account?.name ?? '',
      openingDebitKopecks: opening.debitKopecks,
      openingCreditKopecks: opening.creditKopecks,
      turnoverDebitKopecks: aggregate.turnoverDebitKopecks,
      turnoverCreditKopecks: aggregate.turnoverCreditKopecks,
      closingDebitKopecks: closing.debitKopecks,
      closingCreditKopecks: closing.creditKopecks,
    });
  }

  rows.sort((rowA, rowB) => compareAccountCodes(rowA.code, rowB.code));

  const totals = rows.reduce<TrialBalanceTotals>(
    (accumulatedTotals, row) => ({
      openingDebitKopecks:
        accumulatedTotals.openingDebitKopecks + row.openingDebitKopecks,
      openingCreditKopecks:
        accumulatedTotals.openingCreditKopecks + row.openingCreditKopecks,
      turnoverDebitKopecks:
        accumulatedTotals.turnoverDebitKopecks + row.turnoverDebitKopecks,
      turnoverCreditKopecks:
        accumulatedTotals.turnoverCreditKopecks + row.turnoverCreditKopecks,
      closingDebitKopecks:
        accumulatedTotals.closingDebitKopecks + row.closingDebitKopecks,
      closingCreditKopecks:
        accumulatedTotals.closingCreditKopecks + row.closingCreditKopecks,
    }),
    ZERO_TOTALS,
  );

  return { rows, totals };
};
