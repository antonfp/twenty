// Generated from docs/erp-design/balance-template.html — embedded as a TS string because
// the server build does not copy non-TS assets.
export const BALANCE_SHEET_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Бухгалтерский баланс на {{report_date}}</title>
<style>
  /* Печатная форма «Бухгалтерский баланс» (упрощённая форма, ФСБУ 4/2023
     Приложение № 9), классический вид 1С. Ink-only, без логотипа и
     брендовых цветов — см. osv-template.html/schet-template.html. */
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
  .statement .section-row td {
    font-weight: bold;
    background: #f0f0f0;
  }
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
  <h1 class="doc-title">Бухгалтерский баланс</h1>
  <div class="doc-period">упрощённая форма (ФСБУ 4/2023, Приложение № 9) на {{report_date}}</div>
  <div class="doc-unit">Единица измерения: тыс. руб.</div>

  <table class="statement">
    <thead>
      <tr>
        <th class="c-label">Наименование показателя</th>
        <th class="c-code">Код</th>
        <th class="c-amt">На {{report_date}}</th>
        <th class="c-amt">На {{previous_report_date}}</th>
      </tr>
    </thead>
    <tbody>
      <tr class="section-row"><td colspan="4">АКТИВ</td></tr>
      <tr>
        <td class="c-label">Материальные внеоборотные активы</td>
        <td class="c-code">1150</td>
        <td class="c-amt">{{line_1150_current}}</td>
        <td class="c-amt">{{line_1150_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Нематериальные, финансовые и другие внеоборотные активы</td>
        <td class="c-code">1170</td>
        <td class="c-amt">{{line_1170_current}}</td>
        <td class="c-amt">{{line_1170_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Запасы</td>
        <td class="c-code">1210</td>
        <td class="c-amt">{{line_1210_current}}</td>
        <td class="c-amt">{{line_1210_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Денежные средства и денежные эквиваленты</td>
        <td class="c-code">1250</td>
        <td class="c-amt">{{line_1250_current}}</td>
        <td class="c-amt">{{line_1250_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Финансовые и другие оборотные активы</td>
        <td class="c-code">1230</td>
        <td class="c-amt">{{line_1230_current}}</td>
        <td class="c-amt">{{line_1230_previous}}</td>
      </tr>
      <tr class="total-row">
        <td class="c-label">БАЛАНС</td>
        <td class="c-code">1600</td>
        <td class="c-amt">{{line_1600_current}}</td>
        <td class="c-amt">{{line_1600_previous}}</td>
      </tr>

      <tr class="section-row"><td colspan="4">ПАССИВ</td></tr>
      <tr>
        <td class="c-label">Капитал и резервы</td>
        <td class="c-code">1370</td>
        <td class="c-amt">{{line_1370_current}}</td>
        <td class="c-amt">{{line_1370_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Долгосрочные заёмные средства</td>
        <td class="c-code">1410</td>
        <td class="c-amt">{{line_1410_current}}</td>
        <td class="c-amt">{{line_1410_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Другие долгосрочные обязательства</td>
        <td class="c-code">1450</td>
        <td class="c-amt">{{line_1450_current}}</td>
        <td class="c-amt">{{line_1450_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Краткосрочные заёмные средства</td>
        <td class="c-code">1510</td>
        <td class="c-amt">{{line_1510_current}}</td>
        <td class="c-amt">{{line_1510_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Кредиторская задолженность</td>
        <td class="c-code">1520</td>
        <td class="c-amt">{{line_1520_current}}</td>
        <td class="c-amt">{{line_1520_previous}}</td>
      </tr>
      <tr>
        <td class="c-label">Другие краткосрочные обязательства</td>
        <td class="c-code">1550</td>
        <td class="c-amt">{{line_1550_current}}</td>
        <td class="c-amt">{{line_1550_previous}}</td>
      </tr>
      <tr class="total-row">
        <td class="c-label">БАЛАНС</td>
        <td class="c-code">1700</td>
        <td class="c-amt">{{line_1700_current}}</td>
        <td class="c-amt">{{line_1700_previous}}</td>
      </tr>
    </tbody>
  </table>

</div>
</body>
</html>
`;
