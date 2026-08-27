// Generated from docs/erp-design/ofr-template.html — embedded as a TS string because
// the server build does not copy non-TS assets.
export const INCOME_STATEMENT_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Отчёт о финансовых результатах за {{date_from}} — {{date_to}}</title>
<style>
  /* Печатная форма «Отчёт о финансовых результатах» (упрощённая форма,
     ФСБУ 4/2023 Приложение № 9), классический вид 1С. Ink-only — см.
     balance-template.html/osv-template.html. */
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
    max-width: 175mm;
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
  .org-requisites { font-size: 9pt; margin-top: 1mm; }
  h1.doc-title {
    font-size: 15pt;
    font-weight: bold;
    margin: 2mm 0 1mm;
    padding-bottom: 2mm;
    border-bottom: 2px solid #000;
  }
  .doc-period { margin-bottom: 1mm; }
  .doc-unit { margin-bottom: 4mm; font-style: italic; }

  /* ── Таблица показателей ───────────────────────────────────── */
  table.statement { margin-top: 2mm; }
  .statement th, .statement td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .statement thead { display: table-header-group; }
  .statement th { font-weight: bold; text-align: center; }
  .statement .c-label { text-align: left; }
  .statement .c-code  { width: 16mm; text-align: center; }
  .statement .c-amt   { width: 28mm; text-align: right; }
  .statement tbody .c-label { text-align: left; }
  .statement .total-row td {
    font-weight: bold;
    border-top: 2px solid #000;
  }
</style>
</head>
<body>
<div class="sheet">

  <div class="org-name">{{organization_name}}</div>
  <div class="org-requisites">ИНН {{organization_inn}} КПП {{organization_kpp}}</div>
  <h1 class="doc-title">Отчёт о финансовых результатах</h1>
  <div class="doc-period">упрощённая форма (ФСБУ 4/2023, Приложение № 9) за период с {{date_from}} по {{date_to}}</div>
  <div class="doc-unit">Единица измерения: тыс. руб.</div>

  <table class="statement">
    <thead>
      <tr>
        <th class="c-label">Наименование показателя</th>
        <th class="c-code">Код</th>
        <th class="c-amt">За {{date_from}} — {{date_to}}</th>
        <th class="c-amt">За {{previous_date_from}} — {{previous_date_to}}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="c-label">Выручка</td>
        <td class="c-code">2110</td>
        <td class="c-amt">{{line_2110_current}}</td>
        <td class="c-amt">{{line_2110_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Расходы по обычной деятельности</td>
        <td class="c-code">2120</td>
        <td class="c-amt">{{line_2120_current}}</td>
        <td class="c-amt">{{line_2120_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Проценты к уплате</td>
        <td class="c-code">2330</td>
        <td class="c-amt">{{line_2330_current}}</td>
        <td class="c-amt">{{line_2330_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Прочие доходы</td>
        <td class="c-code">2340</td>
        <td class="c-amt">{{line_2340_current}}</td>
        <td class="c-amt">{{line_2340_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Прочие расходы</td>
        <td class="c-code">2350</td>
        <td class="c-amt">{{line_2350_current}}</td>
        <td class="c-amt">{{line_2350_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Налоги на прибыль (доходы)</td>
        <td class="c-code">2410</td>
        <td class="c-amt">{{line_2410_current}}</td>
        <td class="c-amt">{{line_2410_previous}}</td>
      </tr>
      <tr class="total-row">
        <td class="c-label">Прибыль (убыток) до налогообложения</td>
        <td class="c-code">2300</td>
        <td class="c-amt">{{line_2300_current}}</td>
        <td class="c-amt">{{line_2300_previous}}</td>
      </tr>
      <tr class="total-row">
        <td class="c-label">Чистая прибыль (убыток)</td>
        <td class="c-code">2400</td>
        <td class="c-amt">{{line_2400_current}}</td>
        <td class="c-amt">{{line_2400_previous}}</td>
      </tr>
    </tbody>
  </table>

</div>
</body>
</html>
`;
