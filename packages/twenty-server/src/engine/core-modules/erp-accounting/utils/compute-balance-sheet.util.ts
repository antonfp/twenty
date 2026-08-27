// Бухгалтерский баланс (упрощённая форма, ФСБУ 4/2023 Приложение № 9) — pure
// mapping/aggregation layer, deliberately separated from the SQL fetch
// (balance-sheet.service.ts) so the line mapping is unit-testable without a
// database. Line codes/labels and their account-code mapping are taken from
// docs/research/phase9-10-ru-accounting.md §1, restricted to the actual
// 30-account рабочий план счетов seeded by erp-accounting's post-install
// (packages/twenty-apps/internal/erp-accounting/.../logic-functions/post-install.ts)
// — see docs/erp-design/balance-spec.md §3 for the full account-by-account
// rationale, including the MVP fold-ins (26/94 into Запасы, 90.x/91.x/84/99
// into Капитал и резервы) that make актив=пассив hold even before Task 5
// «Закрытие месяца» exists.
export type BalanceSheetLineGroup = 'ASSET' | 'LIABILITY';

// RAW: the line takes the account's own net (Дт−Кт) as-is on an ASSET line,
// or its negation (Кт−Дт) on a LIABILITY line — correct for every account
// whose kind matches its group by construction (a contra account like 02
// works too: its normal credit balance is already negative under Дт−Кт, so
// summing it straight into an ASSET line subtracts it, exactly right).
// AP_DEBIT_PART/AP_CREDIT_PART: ruling «свёртка 60/62/71/76 развёрнуто по
// сальдо» — split the SAME account's balance by sign across TWO lines (one
// per group) instead of a single RAW placement. Only these four codes get
// the split; every other счёт активно-пассивный in the seeded план (68.01,
// 68.02, 69, 75, 84, 99) is intentionally a single RAW line per the ruling's
// literal (non-exhaustive-by-design) code list — documented in
// balance-spec.md §3.4.
type ContributionMode = 'RAW' | 'AP_DEBIT_PART' | 'AP_CREDIT_PART';

type BalanceSheetLineContribution = {
  accountCode: string;
  mode: ContributionMode;
};

type BalanceSheetLineDefinition = {
  code: string;
  label: string;
  group: BalanceSheetLineGroup;
  contributions: readonly BalanceSheetLineContribution[];
};

export type BalanceSheetLineValue = {
  code: string;
  label: string;
  group: BalanceSheetLineGroup;
  currentKopecks: number;
  previousKopecks: number;
};

export type BalanceSheetTotals = {
  assetsCurrentKopecks: number;
  assetsPreviousKopecks: number;
  liabilitiesCurrentKopecks: number;
  liabilitiesPreviousKopecks: number;
};

const raw = (accountCode: string): BalanceSheetLineContribution => ({
  accountCode,
  mode: 'RAW',
});
const apDebitPart = (accountCode: string): BalanceSheetLineContribution => ({
  accountCode,
  mode: 'AP_DEBIT_PART',
});
const apCreditPart = (accountCode: string): BalanceSheetLineContribution => ({
  accountCode,
  mode: 'AP_CREDIT_PART',
});

const BALANCE_SHEET_LINES: readonly BalanceSheetLineDefinition[] = [
  {
    code: '1150',
    label: 'Материальные внеоборотные активы',
    group: 'ASSET',
    contributions: [raw('01'), raw('02'), raw('08')],
  },
  {
    code: '1170',
    label: 'Нематериальные, финансовые и другие внеоборотные активы',
    group: 'ASSET',
    contributions: [raw('04')],
  },
  {
    code: '1210',
    label: 'Запасы',
    group: 'ASSET',
    // 26/94 — see the file-header note: MVP fold-in of the two temporary/
    // clearing accounts the seeded план has that research's regulatory
    // mapping doesn't cover (a properly closed period carries no balance on
    // either — Task 5 «Закрытие месяца» will zero 26 into 90.x; until then
    // they're carried here so an open period still balances).
    contributions: [
      raw('10'),
      raw('41.01'),
      raw('20'),
      raw('44'),
      raw('19.04'),
      raw('26'),
      raw('94'),
    ],
  },
  {
    code: '1250',
    label: 'Денежные средства и денежные эквиваленты',
    group: 'ASSET',
    contributions: [raw('50'), raw('51')],
  },
  {
    code: '1230',
    label: 'Финансовые и другие оборотные активы',
    group: 'ASSET',
    contributions: [
      apDebitPart('60.01'),
      apDebitPart('62.01'),
      apDebitPart('71'),
      apDebitPart('76'),
    ],
  },
  {
    code: '1370',
    label: 'Капитал и резервы',
    group: 'LIABILITY',
    // Folds in the P&L accounts' live (unclosed) net result — see the
    // file-header note and balance-spec.md §3.3: this is what keeps
    // актив=пассив true for an interim balance sheet drawn before Task 5's
    // «закрытие месяца»/«реформация» ever runs.
    contributions: [
      raw('80'),
      raw('84'),
      raw('99'),
      raw('90.01.1'),
      raw('90.02.1'),
      raw('90.03'),
      raw('91.01'),
      raw('91.02'),
    ],
  },
  {
    code: '1410',
    label: 'Долгосрочные заёмные средства',
    group: 'LIABILITY',
    // Always 0 in this MVP план счетов — no счёт 67 seeded (balance-spec.md §3.5).
    contributions: [],
  },
  {
    code: '1450',
    label: 'Другие долгосрочные обязательства',
    group: 'LIABILITY',
    contributions: [], // Нет 77/96 в плане.
  },
  {
    code: '1510',
    label: 'Краткосрочные заёмные средства',
    group: 'LIABILITY',
    contributions: [], // Нет 66/67 в плане.
  },
  {
    code: '1520',
    label: 'Кредиторская задолженность',
    group: 'LIABILITY',
    contributions: [
      apCreditPart('60.01'),
      apCreditPart('62.01'),
      apCreditPart('71'),
      apCreditPart('76'),
      raw('68.01'),
      raw('68.02'),
      raw('69'),
      raw('70'),
      raw('75'),
    ],
  },
  {
    code: '1550',
    label: 'Другие краткосрочные обязательства',
    group: 'LIABILITY',
    contributions: [], // Нет 86/96/98 в плане.
  },
];

// AP split: net≥0 → whole balance on the debit (asset) part; net<0 → whole
// (absolute) balance on the credit (liability) part — same formula as
// compute-trial-balance.util.ts's «развёрнуто» presentation, duplicated
// locally (that file's version isn't exported and the two aren't otherwise
// coupled) rather than imported across an unrelated module boundary.
const splitBySign = (
  netKopecks: number,
): { debitKopecks: number; creditKopecks: number } =>
  netKopecks >= 0
    ? { debitKopecks: netKopecks, creditKopecks: 0 }
    : { debitKopecks: 0, creditKopecks: -netKopecks };

const contributionValue = (
  contribution: BalanceSheetLineContribution,
  group: BalanceSheetLineGroup,
  netByCode: ReadonlyMap<string, number>,
): number => {
  const net = netByCode.get(contribution.accountCode) ?? 0;

  if (contribution.mode === 'AP_DEBIT_PART') {
    return splitBySign(net).debitKopecks;
  }

  if (contribution.mode === 'AP_CREDIT_PART') {
    return splitBySign(net).creditKopecks;
  }

  return group === 'ASSET' ? net : -net;
};

const sumContributions = (
  definition: BalanceSheetLineDefinition,
  netByCode: ReadonlyMap<string, number>,
): number =>
  definition.contributions.reduce(
    (sum, contribution) =>
      sum + contributionValue(contribution, definition.group, netByCode),
    0,
  );

// netByCode: net (Дт−Кт) balance in kopecks per account CODE, as of one
// point in time — the caller (balance-sheet.service.ts) computes this twice
// (current date, 31.12 prior year) and passes both maps in here unrounded;
// rounding to тыс.руб. happens only at render time
// (render-balance-sheet-html.util.ts), applied identically to every printed
// number including 1600/1700 — see balance-spec.md §5 «Округление» for why
// that specific order (compute exact, round each printed cell independently,
// including the totals) is what guarantees printed 1600 = printed 1700
// while accepting that Σ printed lines may differ from the printed total by
// a thousand roubles (documented, expected artifact of independent rounding).
export const computeBalanceSheetLines = (
  currentNetByCode: ReadonlyMap<string, number>,
  previousNetByCode: ReadonlyMap<string, number>,
): { lines: BalanceSheetLineValue[]; totals: BalanceSheetTotals } => {
  const lines = BALANCE_SHEET_LINES.map((definition) => ({
    code: definition.code,
    label: definition.label,
    group: definition.group,
    currentKopecks: sumContributions(definition, currentNetByCode),
    previousKopecks: sumContributions(definition, previousNetByCode),
  }));

  const sumGroup = (
    group: BalanceSheetLineGroup,
    pick: (line: BalanceSheetLineValue) => number,
  ): number =>
    lines
      .filter((line) => line.group === group)
      .reduce((sum, line) => sum + pick(line), 0);

  return {
    lines,
    totals: {
      assetsCurrentKopecks: sumGroup('ASSET', (line) => line.currentKopecks),
      assetsPreviousKopecks: sumGroup('ASSET', (line) => line.previousKopecks),
      liabilitiesCurrentKopecks: sumGroup(
        'LIABILITY',
        (line) => line.currentKopecks,
      ),
      liabilitiesPreviousKopecks: sumGroup(
        'LIABILITY',
        (line) => line.previousKopecks,
      ),
    },
  };
};
