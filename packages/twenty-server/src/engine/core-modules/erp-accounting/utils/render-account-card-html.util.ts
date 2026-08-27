import { ACCOUNT_CARD_TEMPLATE_HTML } from 'src/engine/core-modules/erp-accounting/constants/account-card-template.constant';
import { type AccountCardDocumentRow } from 'src/engine/core-modules/erp-accounting/utils/compute-account-card.util';
import {
  formatDateRuShort,
  formatMoneyRu,
} from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  extractLineBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
} from 'src/engine/core-modules/erp/utils/fill-print-template.util';

export type AccountCardHtmlData = {
  organizationName: string;
  accountCode: string;
  accountName: string;
  // YYYY-MM-DD
  dateFrom: string;
  dateTo: string;
  openingBalanceDebitKopecks: number;
  openingBalanceCreditKopecks: number;
  rows: AccountCardDocumentRow[];
  closingBalanceDebitKopecks: number;
  closingBalanceCreditKopecks: number;
  totalDebitKopecks: number;
  totalCreditKopecks: number;
};

const OPENING_BALANCE_LABEL = 'Сальдо на начало периода';
const CLOSING_BALANCE_LABEL = 'Сальдо на конец периода';

// Ruling («печать в руб. с копейками, как ОСВ, не тыс.»): zero cells print
// blank, same convention as render-trial-balance-html.util.ts — a movement
// row only fills the side it actually moved.
const formatCellRu = (kopecks: number): string =>
  kopecks === 0 ? '' : formatMoneyRu(kopecks);

const buildBalanceRowValues = (
  label: string,
  debitKopecks: number,
  creditKopecks: number,
): Record<string, string> => ({
  date: '',
  document: label,
  corr_account: '',
  debit: '',
  credit: '',
  balance_debit: formatCellRu(debitKopecks),
  balance_credit: formatCellRu(creditKopecks),
});

const buildMovementRowValues = (
  row: AccountCardDocumentRow,
): Record<string, string> => ({
  date: formatDateRuShort(row.date),
  document: row.documentLabel,
  corr_account: row.correspondingAccountCode,
  debit: formatCellRu(row.debitKopecks),
  credit: formatCellRu(row.creditKopecks),
  balance_debit: formatCellRu(row.runningBalanceDebitKopecks),
  balance_credit: formatCellRu(row.runningBalanceCreditKopecks),
});

export const renderAccountCardHtml = ({
  organizationName,
  accountCode,
  accountName,
  dateFrom,
  dateTo,
  openingBalanceDebitKopecks,
  openingBalanceCreditKopecks,
  rows,
  closingBalanceDebitKopecks,
  closingBalanceCreditKopecks,
  totalDebitKopecks,
  totalCreditKopecks,
}: AccountCardHtmlData): string => {
  const headerValues: Record<string, string> = {
    organization_name: organizationName,
    account_code: accountCode,
    account_name: accountName,
    date_from: formatDateRuShort(dateFrom),
    date_to: formatDateRuShort(dateTo),
    total_debit: formatMoneyRu(totalDebitKopecks),
    total_credit: formatMoneyRu(totalCreditKopecks),
  };

  const lineBlockTemplate = extractLineBlockTemplate(
    ACCOUNT_CARD_TEMPLATE_HTML,
  );
  // Ruling («хронологический список... входящее сальдо... исходящее
  // сальдо»): opening/closing print as the first/last table rows (1С
  // «Карточка счёта» convention), sharing the same line-block template as
  // ordinary movement rows — only document/balance cells are filled.
  const renderedRows = [
    fillPlaceholders(
      lineBlockTemplate,
      buildBalanceRowValues(
        OPENING_BALANCE_LABEL,
        openingBalanceDebitKopecks,
        openingBalanceCreditKopecks,
      ),
    ),
    ...rows.map((row) =>
      fillPlaceholders(lineBlockTemplate, buildMovementRowValues(row)),
    ),
    fillPlaceholders(
      lineBlockTemplate,
      buildBalanceRowValues(
        CLOSING_BALANCE_LABEL,
        closingBalanceDebitKopecks,
        closingBalanceCreditKopecks,
      ),
    ),
  ].join('');

  return fillPrintTemplate({
    template: ACCOUNT_CARD_TEMPLATE_HTML,
    headerValues,
    renderedLinesHtml: renderedRows,
  });
};
