// Закрытие месяца (Task 5, research §3) — pure computation layer over
// per-account turnover, mirroring compute-income-statement.util.ts's split
// from the SQL fetch (month-close-posting-rules.service.ts /
// gl-contributors.service.ts). See that file's CRITICAL comment: these are
// the ONLY five source accounts monthClose ever reads, and 90.09/91.09/99/84
// are the ONLY accounts it ever writes — no overlap, no double counting.
import {
  type AccountTurnover,
  INCOME_STATEMENT_ACCOUNT_CODES,
} from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';

const REVENUE_CODE = '90.01.1';
const COST_OF_SALES_CODE = '90.02.1';
const VAT_ON_SALES_CODE = '90.03';
const OTHER_INCOME_CODE = '91.01';
const OTHER_EXPENSES_CODE = '91.02';

export const MONTH_CLOSE_SOURCE_ACCOUNT_CODES: readonly string[] =
  INCOME_STATEMENT_ACCOUNT_CODES;

export const MONTH_CLOSE_ACCOUNT_CODE = {
  SALES_RESULT: '90.09',
  OTHER_RESULT: '91.09',
  PROFIT_LOSS: '99',
  RETAINED_EARNINGS: '84',
} as const;

export type MonthCloseLegDraft = {
  debitCode: string;
  creditCode: string;
  amountKopecks: number;
};

export type MonthCloseComputationResult = {
  legs: MonthCloseLegDraft[];
  hasMonthlyTurnover: boolean;
};

// 'YYYY-MM-01' → 'YYYY-(MM+1)-01' (December rolls into next January) — same
// Date.UTC(year, month, day) idiom as report-comparative-period.util.ts,
// safe here because the inputs are plain integers, not a locally-parsed
// Date (no timezone shift risk).
export const firstDayOfNextMonth = (periodFirstOfMonth: string): string => {
  const [year, month] = periodFirstOfMonth.split('-').map(Number);

  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
};

// Shared by close_month (MCP path, month-close.service.ts) and
// month-close-posting-rules.service.ts's UI-posting-date default (review
// Minor #3, phase-9 final) — one place computing "закрывающая дата" so both
// paths date closing entries the same way instead of drifting apart.
export const lastDayOfMonth = (periodFirstOfMonth: string): string => {
  const lastDayDate = new Date(firstDayOfNextMonth(periodFirstOfMonth));

  lastDayDate.setUTCDate(lastDayDate.getUTCDate() - 1);

  return lastDayDate.toISOString().slice(0, 10);
};

const ZERO_TURNOVER: AccountTurnover = { debitKopecks: 0, creditKopecks: 0 };

const turnoverOf = (
  code: string,
  byCode: ReadonlyMap<string, AccountTurnover>,
): AccountTurnover => byCode.get(code) ?? ZERO_TURNOVER;

// credit-debit, uniformly for every account regardless of its normal side —
// summing this across a account's own family gives exactly the family's
// профит (a debit-heavy expense account contributes negatively on its own).
const netCreditBalanceKopecks = (turnover: AccountTurnover): number =>
  turnover.creditKopecks - turnover.debitKopecks;

const sumNetCreditBalanceKopecks = (
  codes: readonly string[],
  byCode: ReadonlyMap<string, AccountTurnover>,
): number =>
  codes.reduce(
    (sum, code) => sum + netCreditBalanceKopecks(turnoverOf(code, byCode)),
    0,
  );

// Сворачивающая проводка (research §3): netAmount ≥ 0 (прибыль) — Дт
// debitCodeIfPositive Кт creditCodeIfPositive; иначе (убыток) — стороны
// меняются местами, сумма по модулю. Нулевая сумма — валидный "нулевой"
// draft: buildRows в gl-contributors.service.ts пропускает такие строки.
const closingLeg = (
  netAmountKopecks: number,
  debitCodeIfPositive: string,
  creditCodeIfPositive: string,
): MonthCloseLegDraft =>
  netAmountKopecks >= 0
    ? {
        debitCode: debitCodeIfPositive,
        creditCode: creditCodeIfPositive,
        amountKopecks: netAmountKopecks,
      }
    : {
        debitCode: creditCodeIfPositive,
        creditCode: debitCodeIfPositive,
        amountKopecks: -netAmountKopecks,
      };

// monthlyByCode: обороты (Σ дебет, Σ кредит по счёту) СТРОГО за закрываемый
// месяц. yearlyByCode: обороты с 1 января по конец периода включительно —
// передаётся только при реформации (декабрь), иначе обнуление/99→84 не
// считается. Сама проводка 90.09/91.09→99 всегда месячная (research §3:
// «закрывается только результирующий субсчёт 90.09/91.09 на 99» —
// ежемесячно, нарастающим итогом ничего не закрывается).
export const computeMonthCloseLegs = (
  monthlyByCode: ReadonlyMap<string, AccountTurnover>,
  yearlyByCode?: ReadonlyMap<string, AccountTurnover>,
): MonthCloseComputationResult => {
  const hasMonthlyTurnover = MONTH_CLOSE_SOURCE_ACCOUNT_CODES.some((code) => {
    const turnover = turnoverOf(code, monthlyByCode);

    return turnover.debitKopecks !== 0 || turnover.creditKopecks !== 0;
  });

  const ordinaryNetKopecks = sumNetCreditBalanceKopecks(
    [REVENUE_CODE, COST_OF_SALES_CODE, VAT_ON_SALES_CODE],
    monthlyByCode,
  );
  const otherNetKopecks = sumNetCreditBalanceKopecks(
    [OTHER_INCOME_CODE, OTHER_EXPENSES_CODE],
    monthlyByCode,
  );

  const legs: MonthCloseLegDraft[] = [
    closingLeg(
      ordinaryNetKopecks,
      MONTH_CLOSE_ACCOUNT_CODE.SALES_RESULT,
      MONTH_CLOSE_ACCOUNT_CODE.PROFIT_LOSS,
    ),
    closingLeg(
      otherNetKopecks,
      MONTH_CLOSE_ACCOUNT_CODE.OTHER_RESULT,
      MONTH_CLOSE_ACCOUNT_CODE.PROFIT_LOSS,
    ),
  ];

  if (yearlyByCode) {
    // Обнуление субсчетов взаимными оборотами на 90.09/91.09 (research §3,
    // п.1-2 годовой реформации): zeroLeg по годовому сальдо каждого субсчёта
    // — сумма трёх/двух таких проводок на 90.09/91.09 в точности гасит их
    // накопленный за год остаток от ежемесячных закрытий (см. вывод в
    // task-5-report.md), так что отдельная проводка по самому 90.09/91.09 не
    // нужна.
    const zeroLeg = (code: string, counterpartCode: string) =>
      closingLeg(
        netCreditBalanceKopecks(turnoverOf(code, yearlyByCode)),
        code,
        counterpartCode,
      );

    legs.push(
      zeroLeg(REVENUE_CODE, MONTH_CLOSE_ACCOUNT_CODE.SALES_RESULT),
      zeroLeg(COST_OF_SALES_CODE, MONTH_CLOSE_ACCOUNT_CODE.SALES_RESULT),
      zeroLeg(VAT_ON_SALES_CODE, MONTH_CLOSE_ACCOUNT_CODE.SALES_RESULT),
      zeroLeg(OTHER_INCOME_CODE, MONTH_CLOSE_ACCOUNT_CODE.OTHER_RESULT),
      zeroLeg(OTHER_EXPENSES_CODE, MONTH_CLOSE_ACCOUNT_CODE.OTHER_RESULT),
    );

    // Закрытие 99→84 по годовому сальдо 99 (research §3, п.3). 99 в этой
    // системе получает проводки ТОЛЬКО из ежемесячных закрытий 90.09/91.09
    // (никакой другой провайдер на 99 не пишет — MVP), поэтому годовое
    // сальдо 99 аналитически равно сумме годовых netCreditBalance пяти
    // источников — отдельный SQL-запрос по счёту 99 не нужен.
    const netProfitYearKopecks =
      sumNetCreditBalanceKopecks(
        [REVENUE_CODE, COST_OF_SALES_CODE, VAT_ON_SALES_CODE],
        yearlyByCode,
      ) +
      sumNetCreditBalanceKopecks(
        [OTHER_INCOME_CODE, OTHER_EXPENSES_CODE],
        yearlyByCode,
      );

    legs.push(
      closingLeg(
        netProfitYearKopecks,
        MONTH_CLOSE_ACCOUNT_CODE.PROFIT_LOSS,
        MONTH_CLOSE_ACCOUNT_CODE.RETAINED_EARNINGS,
      ),
    );
  }

  return { legs, hasMonthlyTurnover };
};
