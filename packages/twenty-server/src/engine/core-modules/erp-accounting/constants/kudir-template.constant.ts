// Generated from docs/erp-design/kudir-template.html — embedded as a TS
// string because the server build does not copy non-TS assets (same
// convention as account-card-template.constant.ts et al.).
export const KUDIR_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>КУДиР за {{year}} год — {{organization_name}}</title>
<style>
  /* Печатная форма КУДиР (приказ ФНС ЕА-7-3/816@) — тот же ink-only стиль,
     что и в ОСВ/карточке счёта (osv-template.html). */
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

  /* ── Титульный лист ────────────────────────────────────────── */
  .org-name { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
  h1.doc-title {
    font-size: 13pt;
    font-weight: bold;
    margin: 2mm 0 4mm;
    padding-bottom: 2mm;
    border-bottom: 2px solid #000;
  }
  .title-row { margin: 1mm 0; }
  .title-label { display: inline-block; min-width: 55mm; }

  h2.section-title { font-size: 12pt; font-weight: bold; margin: 6mm 0 2mm; }

  /* ── Раздел I ──────────────────────────────────────────────── */
  table.kudir { margin-top: 2mm; }
  .kudir th, .kudir td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .kudir thead { display: table-header-group; }
  .kudir th { font-weight: bold; text-align: center; }
  .kudir .c-num { width: 10mm; text-align: center; }
  .kudir .c-doc { width: 38mm; text-align: left; }
  .kudir .c-content { text-align: left; }
  .kudir .c-amt { width: 25mm; text-align: right; }
  .kudir tbody .c-num,
  .kudir tbody .c-doc { text-align: center; }
  .kudir tbody .c-content { text-align: left; }
  .kudir tr.total-row td { font-weight: bold; }

  /* ── Прочие разделы (MVP: заголовок + прочерк) ────────────────── */
  .placeholder-section { margin-top: 6mm; }
  .placeholder-section p { padding-left: 2mm; }
</style>
</head>
<body>
<div class="sheet">

  <div class="org-name">{{organization_name}}</div>
  <h1 class="doc-title">Книга учёта доходов и расходов организаций и индивидуальных предпринимателей, применяющих упрощённую систему налогообложения, за {{year}} год</h1>
  <div class="title-row"><span class="title-label">ИНН:</span>{{organization_inn}}</div>
  <div class="title-row"><span class="title-label">Объект налогообложения:</span>{{tax_system_label}}</div>

  <h2 class="section-title">Раздел I. Доходы и расходы</h2>
  <table class="kudir">
    <thead>
      <tr>
        <th class="c-num" rowspan="2">№ п/п</th>
        <th class="c-doc" rowspan="2">Дата и номер первичного документа</th>
        <th class="c-content" rowspan="2">Содержание операции</th>
        <th colspan="2">Сумма, руб.</th>
      </tr>
      <tr>
        <th class="c-amt">доходы, учитываемые при исчислении налоговой базы</th>
        <th class="c-amt">расходы, учитываемые при исчислении налоговой базы</th>
      </tr>
    </thead>
    <tbody>
      <!-- BEGIN line -->
      <tr class="{{row_class}}">
        <td class="c-num">{{seq}}</td>
        <td class="c-doc">{{document}}</td>
        <td class="c-content">{{content}}</td>
        <td class="c-amt">{{income}}</td>
        <td class="c-amt">{{expense}}</td>
      </tr>
      <!-- END line -->
    </tbody>
  </table>

  <div class="placeholder-section">
    <h2 class="section-title">Справка к разделу I</h2>
    <p>— (только для объекта «доходы минус расходы»; не рассчитывается в MVP)</p>
  </div>
  <div class="placeholder-section">
    <h2 class="section-title">Раздел II. Расчёт расходов на приобретение основных средств и нематериальных активов</h2>
    <p>—</p>
  </div>
  <div class="placeholder-section">
    <h2 class="section-title">Раздел III. Расчёт суммы убытка прошлых лет, уменьшающего налоговую базу</h2>
    <p>—</p>
  </div>
  <div class="placeholder-section">
    <h2 class="section-title">Раздел IV. Расчёт суммы торгового сбора, уменьшающей налог</h2>
    <p>—</p>
  </div>

</div>
</body>
</html>
`;
