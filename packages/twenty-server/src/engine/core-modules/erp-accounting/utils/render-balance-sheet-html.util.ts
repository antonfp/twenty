import { BALANCE_SHEET_TEMPLATE_HTML } from 'src/engine/core-modules/erp-accounting/constants/balance-sheet-template.constant';
import {
  type BalanceSheetLineValue,
  type BalanceSheetTotals,
} from 'src/engine/core-modules/erp-accounting/utils/compute-balance-sheet.util';
import {
  formatDateRuShort,
  formatThousandRoublesRu,
  roundKopecksToThousandRoubles,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { fillPlaceholders } from 'src/engine/core-modules/erp/utils/fill-print-template.util';

export type BalanceSheetHtmlData = {
  organizationName: string;
  organizationInn: string;
  organizationKpp: string;
  // YYYY-MM-DD
  reportDate: string;
  previousReportDate: string;
  lines: BalanceSheetLineValue[];
  totals: BalanceSheetTotals;
};

// Ruling («печать регламентированных форм — прочерк на пустой ячейке
// целиком»): unlike trial-balance's «zero row cell blank, zero total
// numeric» split (osv-spec.md §2), Баланс/ОФР print «—» uniformly, totals
// included — see balance-spec.md §2/§5. Checks the ROUNDED (тыс.руб.) value,
// not raw kopecks — a nonzero amount that rounds to zero (e.g. 400 руб =
// 0,4 тыс.) must still print «—», not the literal text "0" (review Finding 1).
const formatCellRu = (kopecks: number): string =>
  roundKopecksToThousandRoubles(kopecks) === 0
    ? '—'
    : formatThousandRoublesRu(kopecks);

// The form has a small, FIXED set of line codes (unlike ОСВ's variable
// per-account rows) — every line gets its own named placeholder pair
// directly in the static template, no repeating-block templating needed.
export const renderBalanceSheetHtml = ({
  organizationName,
  organizationInn,
  organizationKpp,
  reportDate,
  previousReportDate,
  lines,
  totals,
}: BalanceSheetHtmlData): string => {
  const values: Record<string, string> = {
    organization_name: organizationName,
    organization_inn: organizationInn,
    organization_kpp: organizationKpp,
    report_date: formatDateRuShort(reportDate),
    previous_report_date: formatDateRuShort(previousReportDate),
    line_1600_current: formatCellRu(totals.assetsCurrentKopecks),
    line_1600_previous: formatCellRu(totals.assetsPreviousKopecks),
    line_1700_current: formatCellRu(totals.liabilitiesCurrentKopecks),
    line_1700_previous: formatCellRu(totals.liabilitiesPreviousKopecks),
  };

  for (const line of lines) {
    values[`line_${line.code}_current`] = formatCellRu(line.currentKopecks);
    values[`line_${line.code}_previous`] = formatCellRu(line.previousKopecks);
  }

  return fillPlaceholders(BALANCE_SHEET_TEMPLATE_HTML, values);
};
