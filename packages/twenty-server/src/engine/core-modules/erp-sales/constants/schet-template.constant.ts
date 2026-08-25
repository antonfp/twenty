// Generated from docs/erp-design/schet-template.html — embedded as a TS
// string because the server build does not copy non-TS assets.
export const SCHET_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Счёт на оплату № {{invoice_number}} от {{invoice_date}}</title>
<style>
  /* Печатная форма «Счёт на оплату», классический вид 1С. Ink-only. */
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
  td, th { vertical-align: top; }

  /* ── Таблица банковских реквизитов ─────────────────────────── */
  .bank td {
    border: 1px solid #000;
    padding: 2px 4px;
    font-size: 10pt;
  }
  .bank .no-bottom { border-bottom: none; }
  .bank .no-top    { border-top: none; }
  .bank .caption {
    font-size: 7.5pt;
    padding-top: 0;
  }
  .bank .label { width: 14mm; white-space: nowrap; }
  .bank .acc   { width: 52mm; }
  .bank .value-strong { font-weight: bold; }

  /* ── Заголовок ─────────────────────────────────────────────── */
  h1.doc-title {
    font-size: 15pt;
    font-weight: bold;
    margin: 6mm 0 2mm;
    padding-bottom: 2mm;
    border-bottom: 2px solid #000;
  }

  /* ── Стороны ───────────────────────────────────────────────── */
  .parties { margin-top: 4mm; }
  .parties td { padding: 1mm 0; }
  .parties .role { width: 32mm; padding-right: 3mm; }
  .parties .req  { font-weight: bold; }

  /* ── Таблица позиций ───────────────────────────────────────── */
  table.items { margin-top: 4mm; }
  .items th, .items td {
    border: 1px solid #000;
    padding: 2px 4px;
  }
  .items thead { display: table-header-group; }
  .items th { font-weight: bold; text-align: center; }
  .items .c-no    { width: 8mm;  text-align: center; }
  .items .c-name  { text-align: left; }
  .items .c-qty   { width: 16mm; text-align: right; }
  .items .c-unit  { width: 12mm; text-align: center; }
  .items .c-price { width: 26mm; text-align: right; }
  .items .c-sum   { width: 28mm; text-align: right; }

  /* ── Итоги ─────────────────────────────────────────────────── */
  table.totals { margin-top: 1.5mm; }
  .totals td { padding: 0.5mm 4px; }
  .totals .t-label { text-align: right; font-weight: bold; }
  .totals .t-value { width: 28mm; text-align: right; font-weight: bold; }

  /* ── Сумма прописью ────────────────────────────────────────── */
  .summary { margin-top: 3mm; }
  .in-words { font-weight: bold; }

  /* ── Подписи ───────────────────────────────────────────────── */
  .sign-rule {
    border: none;
    border-top: 2px solid #000;
    margin: 5mm 0 6mm;
  }
  table.signatures { margin-top: 2mm; }
  .signatures td { vertical-align: bottom; padding: 2.5mm 0 0; }
  .signatures .s-role { width: 28mm; font-weight: bold; white-space: nowrap; }
  .signatures .s-line {
    width: 48mm;
    border-bottom: 1px solid #000;
  }
  .signatures .s-name {
    width: 38mm;
    white-space: nowrap;
    padding-left: 3mm;
  }
  .signatures .s-gap { width: 10mm; }
  .stamp { margin-top: 6mm; font-weight: bold; }
</style>
</head>
<body>
<div class="sheet">

  <!-- Банковские реквизиты получателя -->
  <table class="bank">
    <tr>
      <td colspan="2" class="no-bottom">{{supplier_bank_name}}</td>
      <td class="label">БИК</td>
      <td class="acc no-bottom">{{supplier_bank_bik}}</td>
    </tr>
    <tr>
      <td colspan="2" class="no-top caption">Банк получателя</td>
      <td class="label">Сч. №</td>
      <td class="acc no-top">{{supplier_bank_corr_account}}</td>
    </tr>
    <tr>
      <td style="width: 40mm;">ИНН {{supplier_inn}}</td>
      <td>КПП {{supplier_kpp}}</td>
      <td class="label" rowspan="3">Сч. №</td>
      <td class="acc" rowspan="3">{{supplier_bank_account}}</td>
    </tr>
    <tr>
      <td colspan="2" class="no-bottom value-strong">{{supplier_short_name}}</td>
    </tr>
    <tr>
      <td colspan="2" class="no-top caption">Получатель</td>
    </tr>
  </table>

  <!-- Заголовок -->
  <h1 class="doc-title">Счёт на оплату № {{invoice_number}} от {{invoice_date}}</h1>

  <!-- Стороны -->
  <table class="parties">
    <tr>
      <td class="role">Поставщик<br>(Исполнитель):</td>
      <td class="req">{{supplier_requisites}}</td>
    </tr>
    <tr>
      <td class="role">Покупатель<br>(Заказчик):</td>
      <td class="req">{{buyer_requisites}}</td>
    </tr>
  </table>

  <!-- Позиции -->
  <table class="items">
    <thead>
      <tr>
        <th class="c-no">№</th>
        <th class="c-name">Товары (работы, услуги)</th>
        <th class="c-qty">Кол-во</th>
        <th class="c-unit">Ед.</th>
        <th class="c-price">Цена</th>
        <th class="c-sum">Сумма</th>
      </tr>
    </thead>
    <tbody>
      <!-- BEGIN line -->
      <tr>
        <td class="c-no">{{row_number}}</td>
        <td class="c-name">{{item_name}}</td>
        <td class="c-qty">{{quantity}}</td>
        <td class="c-unit">{{unit}}</td>
        <td class="c-price">{{price}}</td>
        <td class="c-sum">{{amount}}</td>
      </tr>
      <!-- END line -->
    </tbody>
  </table>

  <!-- Итоги -->
  <table class="totals">
    <tr>
      <td class="t-label">Итого:</td>
      <td class="t-value">{{total_amount}}</td>
    </tr>
    <tr>
      <td class="t-label">{{vat_row_label}}</td>
      <td class="t-value">{{vat_amount}}</td>
    </tr>
    <tr>
      <td class="t-label">Всего к оплате:</td>
      <td class="t-value">{{grand_total}}</td>
    </tr>
  </table>

  <!-- Сумма прописью -->
  <div class="summary">
    <div>Всего наименований {{items_count}}, на сумму {{grand_total}} руб.</div>
    <div class="in-words">{{amount_in_words}}</div>
  </div>

  <!-- Подписи -->
  <hr class="sign-rule">
  <table class="signatures">
    <tr>
      <td class="s-role">Руководитель</td>
      <td class="s-line">&nbsp;</td>
      <td class="s-name">({{director_name}})</td>
      <td class="s-gap">&nbsp;</td>
      <td class="s-role">Бухгалтер</td>
      <td class="s-line">&nbsp;</td>
      <td class="s-name">({{accountant_name}})</td>
    </tr>
  </table>
  <div class="stamp">М.П.</div>

</div>
</body>
</html>
`;
