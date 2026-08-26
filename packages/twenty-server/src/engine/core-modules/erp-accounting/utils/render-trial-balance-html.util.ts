import { TRIAL_BALANCE_TEMPLATE_HTML } from 'src/engine/core-modules/erp-accounting/constants/trial-balance-template.constant';
import {
  type TrialBalanceRow,
  type TrialBalanceTotals,
} from 'src/engine/core-modules/erp-accounting/utils/compute-trial-balance.util';
import {
  formatDateRuShort,
  formatMoneyRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  extractLineBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
} from 'src/engine/core-modules/erp/utils/fill-print-template.util';

export type TrialBalanceHtmlData = {
  organizationName: string;
  // YYYY-MM-DD
  dateFrom: string;
  dateTo: string;
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
};

// Ruling («печатный HTML в стиле наших print-сервисов»): zero cells print
// blank per account row (osv-spec.md §2) — cuts clutter on rows with
// movement on only one side. The totals row always prints numbers (incl.
// 0,00) so an empty period still shows a verifiably balanced Σдт=Σкт line.
const formatCellRu = (kopecks: number): string =>
  kopecks === 0 ? '' : formatMoneyRu(kopecks);

const buildRowValues = (row: TrialBalanceRow): Record<string, string> => ({
  account_code: row.code,
  account_name: row.name,
  opening_debit: formatCellRu(row.openingDebitKopecks),
  opening_credit: formatCellRu(row.openingCreditKopecks),
  turnover_debit: formatCellRu(row.turnoverDebitKopecks),
  turnover_credit: formatCellRu(row.turnoverCreditKopecks),
  closing_debit: formatCellRu(row.closingDebitKopecks),
  closing_credit: formatCellRu(row.closingCreditKopecks),
});

export const renderTrialBalanceHtml = ({
  organizationName,
  dateFrom,
  dateTo,
  rows,
  totals,
}: TrialBalanceHtmlData): string => {
  const headerValues: Record<string, string> = {
    organization_name: organizationName,
    date_from: formatDateRuShort(dateFrom),
    date_to: formatDateRuShort(dateTo),
    total_opening_debit: formatMoneyRu(totals.openingDebitKopecks),
    total_opening_credit: formatMoneyRu(totals.openingCreditKopecks),
    total_turnover_debit: formatMoneyRu(totals.turnoverDebitKopecks),
    total_turnover_credit: formatMoneyRu(totals.turnoverCreditKopecks),
    total_closing_debit: formatMoneyRu(totals.closingDebitKopecks),
    total_closing_credit: formatMoneyRu(totals.closingCreditKopecks),
  };

  const lineBlockTemplate = extractLineBlockTemplate(
    TRIAL_BALANCE_TEMPLATE_HTML,
  );
  const renderedRows = rows
    .map((row) => fillPlaceholders(lineBlockTemplate, buildRowValues(row)))
    .join('');

  return fillPrintTemplate({
    template: TRIAL_BALANCE_TEMPLATE_HTML,
    headerValues,
    renderedLinesHtml: renderedRows,
  });
};
