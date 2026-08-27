// Generated from docs/erp-design/account-card-template.html — embedded as a TS
// string because the server build does not copy non-TS assets.
export const ACCOUNT_CARD_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Карточка счёта {{account_code}} за {{date_from}} — {{date_to}}</title>
<style>
  /* Печатная форма «Карточка счёта», классический вид 1С — макет и CSS
     скопированы из osv-template.html (ОСВ), тот же ink-only стиль. */
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

  /* ── Таблица проводок ──────────────────────────────────────── */
  table.postings { margin-top: 2mm; }
  .postings th, .postings td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .postings thead { display: table-header-group; }
  .postings th { font-weight: bold; text-align: center; }
  .postings .c-date { width: 20mm; text-align: center; }
  .postings .c-doc  { text-align: left; }
  .postings .c-corr { width: 20mm; text-align: center; }
  .postings .c-amt  { width: 22mm; text-align: right; }
  .postings tbody .c-date,
  .postings tbody .c-corr { text-align: center; }
  .postings tbody .c-doc { text-align: left; }
  .postings tfoot td {
    font-weight: bold;
    border-top: 2px solid #000;
  }
</style>
</head>
<body>
<div class="sheet">

  <div class="org-name">{{organization_name}}</div>
  <h1 class="doc-title">Карточка счёта {{account_code}} «{{account_name}}»</h1>
  <div class="doc-period">за период с {{date_from}} по {{date_to}}</div>

  <table class="postings">
    <thead>
      <tr>
        <th class="c-date" rowspan="2">Дата</th>
        <th class="c-doc" rowspan="2">Документ</th>
        <th class="c-corr" rowspan="2">Корр. счёт</th>
        <th class="c-amt" rowspan="2">Дебет</th>
        <th class="c-amt" rowspan="2">Кредит</th>
        <th colspan="2">Текущее сальдо</th>
      </tr>
      <tr>
        <th class="c-amt">Дебет</th>
        <th class="c-amt">Кредит</th>
      </tr>
    </thead>
    <tbody>
      <!-- BEGIN line -->
      <tr>
        <td class="c-date">{{date}}</td>
        <td class="c-doc">{{document}}</td>
        <td class="c-corr">{{corr_account}}</td>
        <td class="c-amt">{{debit}}</td>
        <td class="c-amt">{{credit}}</td>
        <td class="c-amt">{{balance_debit}}</td>
        <td class="c-amt">{{balance_credit}}</td>
      </tr>
      <!-- END line -->
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">Обороты за период</td>
        <td class="c-amt">{{total_debit}}</td>
        <td class="c-amt">{{total_credit}}</td>
        <td class="c-amt"></td>
        <td class="c-amt"></td>
      </tr>
    </tfoot>
  </table>

</div>
</body>
</html>
`;
