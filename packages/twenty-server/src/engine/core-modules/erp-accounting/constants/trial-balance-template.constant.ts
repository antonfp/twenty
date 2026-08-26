// Generated from docs/erp-design/osv-template.html — embedded as a TS
// string because the server build does not copy non-TS assets.
export const TRIAL_BALANCE_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Оборотно-сальдовая ведомость за {{date_from}} — {{date_to}}</title>
<style>
  /* Печатная форма ОСВ (оборотно-сальдовая ведомость), классический вид 1С.
     Ink-only, без логотипа и брендовых цветов — см. schet-template.html. */
  @page {
    size: A4 portrait;
    margin: 15mm 15mm 15mm 20mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color: #000; }
  body {
    font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
    font-size: 10pt;
    line-height: 1.25;
  }
  .sheet {
    max-width: 175mm; /* ширина A4 минус поля — для экранного просмотра */
    margin: 0 auto;
    padding: 10mm 0;
  }
  @media print {
    .sheet { max-width: none; padding: 0; }
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: middle; }

  /* ── Шапка ─────────────────────────────────────────────────── */
  .org-name { font-size: 11pt; font-weight: bold; }
  h1.doc-title {
    font-size: 15pt;
    font-weight: bold;
    margin: 2mm 0 1mm;
    padding-bottom: 2mm;
    border-bottom: 2px solid #000;
  }
  .doc-period { margin-bottom: 4mm; }

  /* ── Таблица счетов ────────────────────────────────────────── */
  table.accounts { margin-top: 2mm; }
  .accounts th, .accounts td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .accounts thead { display: table-header-group; }
  .accounts th { font-weight: bold; text-align: center; }
  .accounts .c-code { width: 16mm; text-align: center; }
  .accounts .c-name { text-align: left; }
  .accounts .c-amt  { width: 22mm; text-align: right; }
  .accounts tbody .c-code,
  .accounts tbody .c-name { text-align: left; }
  .accounts tfoot td {
    font-weight: bold;
    border-top: 2px solid #000;
  }
</style>
</head>
<body>
<div class="sheet">

  <div class="org-name">{{organization_name}}</div>
  <h1 class="doc-title">Оборотно-сальдовая ведомость</h1>
  <div class="doc-period">за период с {{date_from}} по {{date_to}}</div>

  <table class="accounts">
    <thead>
      <tr>
        <th class="c-code" rowspan="2">Счёт</th>
        <th class="c-name" rowspan="2">Наименование счёта</th>
        <th colspan="2">Сальдо на начало периода</th>
        <th colspan="2">Обороты за период</th>
        <th colspan="2">Сальдо на конец периода</th>
      </tr>
      <tr>
        <th class="c-amt">Дебет</th>
        <th class="c-amt">Кредит</th>
        <th class="c-amt">Дебет</th>
        <th class="c-amt">Кредит</th>
        <th class="c-amt">Дебет</th>
        <th class="c-amt">Кредит</th>
      </tr>
    </thead>
    <tbody>
      <!-- BEGIN line -->
      <tr>
        <td class="c-code">{{account_code}}</td>
        <td class="c-name">{{account_name}}</td>
        <td class="c-amt">{{opening_debit}}</td>
        <td class="c-amt">{{opening_credit}}</td>
        <td class="c-amt">{{turnover_debit}}</td>
        <td class="c-amt">{{turnover_credit}}</td>
        <td class="c-amt">{{closing_debit}}</td>
        <td class="c-amt">{{closing_credit}}</td>
      </tr>
      <!-- END line -->
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2">Итого</td>
        <td class="c-amt">{{total_opening_debit}}</td>
        <td class="c-amt">{{total_opening_credit}}</td>
        <td class="c-amt">{{total_turnover_debit}}</td>
        <td class="c-amt">{{total_turnover_credit}}</td>
        <td class="c-amt">{{total_closing_debit}}</td>
        <td class="c-amt">{{total_closing_credit}}</td>
      </tr>
    </tfoot>
  </table>

</div>
</body>
</html>
`;
