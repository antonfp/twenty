import { KUDIR_TEMPLATE_HTML } from 'src/engine/core-modules/erp-accounting/constants/kudir-template.constant';
import { type KudirEntry } from 'src/engine/core-modules/erp-accounting/utils/compute-kudir.util';
import { formatWholeRublesRu } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  extractLineBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
} from 'src/engine/core-modules/erp/utils/fill-print-template.util';

export type KudirHtmlData = {
  organizationName: string;
  organizationInn: string;
  taxSystemLabel: string;
  year: number;
  entries: KudirEntry[];
  totalIncomeKopecks: number;
  totalExpenseKopecks: number;
};

// Ruling («печатается КУДиР в рублях, без копеек, форма ЕА-7-3/816@»): zero
// cell prints blank — same convention as ОСВ/карточка счёта
// (render-account-card-html.util.ts) — applied uniformly to movement AND
// total rows, so a чистo-доходная organization's expense column is blank
// end to end, not a column of zeroes.
const formatCellRu = (kopecks: number): string =>
  kopecks === 0 ? '' : formatWholeRublesRu(kopecks);

const buildRowValues = (entry: KudirEntry): Record<string, string> => ({
  row_class: entry.seq === null ? 'total-row' : '',
  seq: entry.seq === null ? '' : String(entry.seq),
  document: entry.documentLabel ?? '',
  content: entry.content,
  income: formatCellRu(entry.incomeKopecks),
  expense: formatCellRu(entry.expenseKopecks),
});

// totalIncomeKopecks/totalExpenseKopecks are on KudirHtmlData for the MCP
// JSON shape (kudir.tool.ts) — the printed form doesn't repeat them, its
// last "Итого за год" row (in entries) already carries the same numbers.
export const renderKudirHtml = ({
  organizationName,
  organizationInn,
  taxSystemLabel,
  year,
  entries,
}: KudirHtmlData): string => {
  const headerValues: Record<string, string> = {
    organization_name: organizationName,
    organization_inn: organizationInn,
    tax_system_label: taxSystemLabel,
    year: String(year),
  };

  const lineBlockTemplate = extractLineBlockTemplate(KUDIR_TEMPLATE_HTML);
  const renderedRows = entries
    .map((entry) => fillPlaceholders(lineBlockTemplate, buildRowValues(entry)))
    .join('');

  return fillPrintTemplate({
    template: KUDIR_TEMPLATE_HTML,
    headerValues,
    renderedLinesHtml: renderedRows,
  });
};
