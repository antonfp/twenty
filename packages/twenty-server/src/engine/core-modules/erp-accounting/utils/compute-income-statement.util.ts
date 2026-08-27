// Отчёт о финансовых результатах (упрощённая форма, ФСБУ 4/2023 Приложение
// № 9) — pure aggregation layer over per-account turnover, mirroring
// compute-balance-sheet.util.ts's split from the SQL fetch
// (income-statement.service.ts).
//
// CRITICAL ruling (controller conflict-scan finding, phase9 Task 1): the
// revenue/cost/other-income/other-expense lines read ONLY the explicit
// subaccount codes listed below — never 90.09/91.09/99 (the regulated
// month-end closing transfers Task 5 «Закрытие месяца» will start writing).
// This list is deliberately five hardcoded codes, not a `code LIKE '90.%'`
// pattern: once monthClose exists and starts posting Дт90.09/91.09→Кт99
// transfers within the SAME account family, a wildcard would double-count
// (or, depending on sign, zero out) revenue for any period that includes a
// close. The explicit list stays correct unchanged after Task 5 ships.
const REVENUE_CREDIT_ACCOUNT_CODE = '90.01.1';
const REVENUE_VAT_DEBIT_ACCOUNT_CODE = '90.03';
const COST_OF_SALES_DEBIT_ACCOUNT_CODE = '90.02.1';
const OTHER_INCOME_CREDIT_ACCOUNT_CODE = '91.01';
const OTHER_EXPENSES_DEBIT_ACCOUNT_CODE = '91.02';

export const INCOME_STATEMENT_ACCOUNT_CODES: readonly string[] = [
  REVENUE_CREDIT_ACCOUNT_CODE,
  REVENUE_VAT_DEBIT_ACCOUNT_CODE,
  COST_OF_SALES_DEBIT_ACCOUNT_CODE,
  OTHER_INCOME_CREDIT_ACCOUNT_CODE,
  OTHER_EXPENSES_DEBIT_ACCOUNT_CODE,
];

export type AccountTurnover = {
  debitKopecks: number;
  creditKopecks: number;
};

export type IncomeStatementLineValue = {
  code: string;
  label: string;
  currentKopecks: number;
  previousKopecks: number;
};

const ZERO_TURNOVER: AccountTurnover = { debitKopecks: 0, creditKopecks: 0 };

const turnoverOf = (
  code: string,
  byCode: ReadonlyMap<string, AccountTurnover>,
): AccountTurnover => byCode.get(code) ?? ZERO_TURNOVER;

type PeriodLines = {
  revenue: number;
  costOfSales: number;
  interestPayable: number;
  otherIncome: number;
  otherExpenses: number;
  incomeTax: number;
  profitBeforeTax: number;
  netProfit: number;
};

const computePeriodLines = (
  byCode: ReadonlyMap<string, AccountTurnover>,
): PeriodLines => {
  const revenue =
    turnoverOf(REVENUE_CREDIT_ACCOUNT_CODE, byCode).creditKopecks -
    turnoverOf(REVENUE_VAT_DEBIT_ACCOUNT_CODE, byCode).debitKopecks;
  const costOfSales = turnoverOf(
    COST_OF_SALES_DEBIT_ACCOUNT_CODE,
    byCode,
  ).debitKopecks;
  // MVP: research §1 reads 2330 «Проценты к уплате» off a субконто
  // («проценты по займам») on 91.02 that this план/регистр doesn't track —
  // no dedicated account exists to split it out, so it's always 0 and folds
  // wholesale into 2350 below (documented in ofr-spec.md §4).
  const interestPayable = 0;
  const otherIncome = turnoverOf(
    OTHER_INCOME_CREDIT_ACCOUNT_CODE,
    byCode,
  ).creditKopecks;
  const otherExpenses = turnoverOf(
    OTHER_EXPENSES_DEBIT_ACCOUNT_CODE,
    byCode,
  ).debitKopecks;
  // MVP: no regulatory-tax-accrual logic exists yet (no monthClose/tax
  // posting task has shipped) — Дт99/Кт68 never gets written, so this stays
  // 0 and 2400 always equals 2300 for now (ofr-spec.md §4).
  const incomeTax = 0;
  const profitBeforeTax =
    revenue - costOfSales + otherIncome - otherExpenses - interestPayable;
  const netProfit = profitBeforeTax - incomeTax;

  return {
    revenue,
    costOfSales,
    interestPayable,
    otherIncome,
    otherExpenses,
    incomeTax,
    profitBeforeTax,
    netProfit,
  };
};

// current/previousByCode: turnover (Σ debit, Σ credit separately — no
// netting) in kopecks per account CODE over a period — the caller
// (income-statement.service.ts) computes this for [dateFrom,dateTo] and for
// the same range shifted one year back. Unrounded; rounding to тыс.руб.
// happens only at render time, same as the balance sheet.
export const computeIncomeStatementLines = (
  currentByCode: ReadonlyMap<string, AccountTurnover>,
  previousByCode: ReadonlyMap<string, AccountTurnover>,
): IncomeStatementLineValue[] => {
  const current = computePeriodLines(currentByCode);
  const previous = computePeriodLines(previousByCode);

  return [
    {
      code: '2110',
      label: 'Выручка',
      currentKopecks: current.revenue,
      previousKopecks: previous.revenue,
    },
    {
      code: '2120',
      label: 'Расходы по обычной деятельности',
      currentKopecks: current.costOfSales,
      previousKopecks: previous.costOfSales,
    },
    {
      code: '2330',
      label: 'Проценты к уплате',
      currentKopecks: current.interestPayable,
      previousKopecks: previous.interestPayable,
    },
    {
      code: '2340',
      label: 'Прочие доходы',
      currentKopecks: current.otherIncome,
      previousKopecks: previous.otherIncome,
    },
    {
      code: '2350',
      label: 'Прочие расходы',
      currentKopecks: current.otherExpenses,
      previousKopecks: previous.otherExpenses,
    },
    {
      code: '2410',
      label: 'Налоги на прибыль (доходы)',
      currentKopecks: current.incomeTax,
      previousKopecks: previous.incomeTax,
    },
    {
      code: '2300',
      label: 'Прибыль (убыток) до налогообложения',
      currentKopecks: current.profitBeforeTax,
      previousKopecks: previous.profitBeforeTax,
    },
    {
      code: '2400',
      label: 'Чистая прибыль (убыток)',
      currentKopecks: current.netProfit,
      previousKopecks: previous.netProfit,
    },
  ];
};
