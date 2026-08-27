import { INCOME_STATEMENT_TEMPLATE_HTML } from 'src/engine/core-modules/erp-accounting/constants/income-statement-template.constant';
import { type IncomeStatementLineValue } from 'src/engine/core-modules/erp-accounting/utils/compute-income-statement.util';
import {
  formatDateRuShort,
  formatThousandRoublesRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import { fillPlaceholders } from 'src/engine/core-modules/erp/utils/fill-print-template.util';

export type IncomeStatementHtmlData = {
  organizationName: string;
  organizationInn: string;
  organizationKpp: string;
  // YYYY-MM-DD
  dateFrom: string;
  dateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  lines: IncomeStatementLineValue[];
};

// Same «прочерк на пустой ячейке, включая итоговые строки» convention as
// the balance sheet — see balance-spec.md §2/§5.
const formatCellRu = (kopecks: number): string =>
  kopecks === 0 ? '—' : formatThousandRoublesRu(kopecks);

// Fixed 8-line form (2110…2400, 2300/2400 already part of `lines` — unlike
// the balance sheet, no separate totals object) — named placeholders
// directly in the static template, no repeating-block templating needed.
export const renderIncomeStatementHtml = ({
  organizationName,
  organizationInn,
  organizationKpp,
  dateFrom,
  dateTo,
  previousDateFrom,
  previousDateTo,
  lines,
}: IncomeStatementHtmlData): string => {
  const values: Record<string, string> = {
    organization_name: organizationName,
    organization_inn: organizationInn,
    organization_kpp: organizationKpp,
    date_from: formatDateRuShort(dateFrom),
    date_to: formatDateRuShort(dateTo),
    previous_date_from: formatDateRuShort(previousDateFrom),
    previous_date_to: formatDateRuShort(previousDateTo),
  };

  for (const line of lines) {
    values[`line_${line.code}_current`] = formatCellRu(line.currentKopecks);
    values[`line_${line.code}_previous`] = formatCellRu(line.previousKopecks);
  }

  return fillPlaceholders(INCOME_STATEMENT_TEMPLATE_HTML, values);
};
