// Generated from docs/erp-design/upd-template.html — embedded as a TS
// string because the server build does not copy non-TS assets.
export const UPD_TEMPLATE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>УПД № {{document_number}} от {{document_date}}</title>
<style>
  /* Печатная форма УПД: счёт-фактура (ПП 1137 в ред. ПП № 26 от 23.01.2026)
     + передаточная часть письма ФНС ММВ-20-3/96@. Вид 1С, ink-only. */
  @page {
    size: A4 landscape;
    margin: 8mm 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color: #000; }
  body {
    font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
    font-size: 7.5pt;
    line-height: 1.15;
  }
  .sheet {
    max-width: 277mm; /* ширина A4 landscape минус поля — для экранного просмотра */
    margin: 0 auto;
    padding: 6mm 0;
  }
  @media print {
    .sheet { max-width: none; padding: 0; }
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; }

  /* ── Шапка: статус + ссылка на форму ───────────────────────── */
  .form-head { margin-bottom: 1mm; }
  .form-head td { vertical-align: top; }
  .status-box {
    display: inline-block;
    border: 1px solid #000;
    padding: 0.8mm 3mm;
    font-size: 9pt;
    font-weight: bold;
    text-align: center;
  }
  .status-legend {
    font-size: 6pt;
    margin-top: 1mm;
    max-width: 60mm;
  }
  .form-ref {
    text-align: right;
    font-size: 6pt;
    width: 70mm;
  }

  /* ── Заголовок СФ и строки шапки ────────────────────────────── */
  .doc-title {
    font-size: 10pt;
    font-weight: bold;
    margin: 1mm 0 0.5mm;
  }
  .doc-title .row-no { font-size: 8pt; font-weight: normal; }
  .correction { margin-bottom: 1.2mm; }
  .head-lines { table-layout: fixed; }
  .head-lines td { padding: 0.3mm 0; }
  .head-lines .h-label { width: 40%; padding-right: 2mm; }
  .head-lines .h-value {
    font-weight: bold;
    border-bottom: 1px solid #000;
  }
  .head-lines .h-no {
    width: 9mm;
    white-space: nowrap;
    padding-left: 1.5mm;
    font-size: 7pt;
  }
  .head-cols { width: 100%; }
  .head-cols > tbody > tr > td { vertical-align: top; }
  .head-col-left  { width: 55%; padding-right: 5mm; }
  .head-col-right { width: 45%; }

  /* ── Таблица позиций ────────────────────────────────────────── */
  table.items {
    margin-top: 1.5mm;
    table-layout: fixed;
  }
  .items th, .items td {
    border: 1px solid #000;
    padding: 0.5mm 1mm;
    font-size: 6.5pt;
    overflow-wrap: break-word;
  }
  .items thead { display: table-header-group; }
  .items th {
    font-weight: normal;
    text-align: center;
    vertical-align: middle;
    font-size: 5.8pt;
    line-height: 1.1;
  }
  .items .col-no { text-align: center; }
  .items .num { text-align: right; white-space: nowrap; }
  .items .ctr { text-align: center; }
  .items .totals-row td { font-weight: bold; border-top: 1.5px solid #000; }
  .items .totals-label { text-align: right; border-left: none; border-bottom: none; }
  .items .no-border { border-left: none; border-bottom: none; border-right: none; }

  /* ── Сумма прописью ─────────────────────────────────────────── */
  .summary { margin-top: 1mm; }
  .in-words { font-weight: bold; }

  /* ── Подписи СФ-части ───────────────────────────────────────── */
  table.sf-signatures { margin-top: 1.5mm; }
  .sf-signatures td { vertical-align: bottom; padding: 0; }
  .sf-signatures .s-role { white-space: nowrap; padding-right: 2mm; }
  .sf-signatures .s-line {
    border-bottom: 1px solid #000;
    width: 26mm;
  }
  .sf-signatures .s-name {
    border-bottom: 1px solid #000;
    width: 40mm;
    text-align: center;
    font-weight: bold;
  }
  .sf-signatures .s-caption { font-size: 6pt; text-align: center; padding-top: 0.3mm; }
  .sf-signatures .s-gap { width: 8mm; }

  /* ── Передаточная часть ─────────────────────────────────────── */
  .transfer-rule {
    border: none;
    border-top: 2px solid #000;
    margin: 1.5mm 0 1mm;
  }
  .transfer-lines td { padding: 0.3mm 0; }
  table.transfer-cols { margin-top: 0.8mm; }
  .transfer-cols > tbody > tr > td { vertical-align: top; }
  .t-col-left  { width: 50%; padding-right: 3mm; border-right: 1px solid #000; }
  .t-col-right { width: 50%; padding-left: 3mm; }
  .t-block { margin-bottom: 0.8mm; }
  .t-caption { font-size: 6pt; }
  .t-sign td { vertical-align: bottom; padding: 0; }
  .t-sign .t-line { border-bottom: 1px solid #000; width: 24mm; }
  .t-sign .t-name { border-bottom: 1px solid #000; width: 34mm; text-align: center; font-weight: bold; }
  .t-sign .t-gap { width: 3mm; }
  .t-value-line { border-bottom: 1px solid #000; font-weight: bold; }
  .stamp { margin-top: 1mm; font-weight: bold; }
</style>
</head>
<body>
<div class="sheet">

  <!-- Статус и ссылка на форму -->
  <table class="form-head">
    <tr>
      <td>
        <span class="status-box">Статус: {{status}}</span>
        <div class="status-legend">1 — счёт-фактура и передаточный документ (акт)<br>2 — передаточный документ (акт)</div>
      </td>
      <td class="form-ref">Приложение № 1<br>к постановлению Правительства Российской Федерации<br>от 26.12.2011 № 1137<br>(в редакции постановления Правительства Российской Федерации от 23.01.2026 № 26)</td>
    </tr>
  </table>

  <!-- Заголовок СФ -->
  <div class="doc-title">Счёт-фактура № {{document_number}} от {{document_date}} <span class="row-no">(1)</span></div>
  <div class="correction">Исправление № — от — <span class="h-no">(1а)</span></div>

  <!-- Строки шапки СФ -->
  <table class="head-cols">
    <tr>
      <td class="head-col-left">
        <table class="head-lines">
          <tr><td class="h-label">Продавец:</td><td class="h-value">{{seller_name}}</td><td class="h-no">(2)</td></tr>
          <tr><td class="h-label">Адрес:</td><td class="h-value">{{seller_address}}</td><td class="h-no">(2а)</td></tr>
          <tr><td class="h-label">ИНН/КПП продавца:</td><td class="h-value">{{seller_inn_kpp}}</td><td class="h-no">(2б)</td></tr>
          <tr><td class="h-label">Грузоотправитель и его адрес:</td><td class="h-value">{{consignor}}</td><td class="h-no">(3)</td></tr>
          <tr><td class="h-label">Грузополучатель и его адрес:</td><td class="h-value">{{consignee}}</td><td class="h-no">(4)</td></tr>
          <tr><td class="h-label">К платёжно-расчётному документу:</td><td class="h-value">{{payment_document}}</td><td class="h-no">(5)</td></tr>
          <tr><td class="h-label">Документ об отгрузке:</td><td class="h-value">{{shipping_document_info}}</td><td class="h-no">(5а)</td></tr>
          <tr><td class="h-label">К счёту-фактуре (счетам-фактурам), выставленному при получении оплаты, частичной оплаты:</td><td class="h-value">{{advance_invoice_info}}</td><td class="h-no">(5б)</td></tr>
        </table>
      </td>
      <td class="head-col-right">
        <table class="head-lines">
          <tr><td class="h-label">Покупатель:</td><td class="h-value">{{buyer_name}}</td><td class="h-no">(6)</td></tr>
          <tr><td class="h-label">Адрес:</td><td class="h-value">{{buyer_address}}</td><td class="h-no">(6а)</td></tr>
          <tr><td class="h-label">ИНН/КПП покупателя:</td><td class="h-value">{{buyer_inn_kpp}}</td><td class="h-no">(6б)</td></tr>
          <tr><td class="h-label">Валюта: наименование, код</td><td class="h-value">{{currency_info}}</td><td class="h-no">(7)</td></tr>
          <tr><td class="h-label">Идентификатор государственного контракта, договора (соглашения) (при наличии):</td><td class="h-value">{{gov_contract_id}}</td><td class="h-no">(8)</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Таблица позиций -->
  <table class="items">
    <colgroup>
      <col style="width: 2.5%"><col style="width: 4%"><col style="width: 2.5%">
      <col style="width: 18.5%"><col style="width: 3%"><col style="width: 2.8%">
      <col style="width: 3.2%"><col style="width: 4.5%"><col style="width: 6.5%">
      <col style="width: 7%"><col style="width: 4%"><col style="width: 4%">
      <col style="width: 6.5%"><col style="width: 7%"><col style="width: 2.5%">
      <col style="width: 3.5%"><col style="width: 4.5%"><col style="width: 2.5%">
      <col style="width: 3%"><col style="width: 3.5%"><col style="width: 4.5%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">№ п/п</th>
        <th rowspan="2">Код това&shy;ра/ работ, услуг</th>
        <th rowspan="2">№ п/п</th>
        <th rowspan="2">Наименование товара (описание выполненных работ, оказанных услуг), имущественного права</th>
        <th rowspan="2">Код вида товара</th>
        <th colspan="2">Единица измерения</th>
        <th rowspan="2">Коли&shy;чество (объём)</th>
        <th rowspan="2">Цена (тариф) за единицу измерения</th>
        <th rowspan="2">Стоимость товаров (работ, услуг), имущест&shy;венных прав без налога — всего</th>
        <th rowspan="2">В том числе сумма акциза</th>
        <th rowspan="2">Нало&shy;говая ставка</th>
        <th rowspan="2">Сумма налога, предъяв&shy;ляемая покупателю</th>
        <th rowspan="2">Стоимость товаров (работ, услуг), имущест&shy;венных прав с налогом — всего</th>
        <th colspan="2">Страна происхож&shy;дения товара</th>
        <th rowspan="2">Регистра&shy;ционный номер декларации на товары или партии товара, подлежа&shy;щего просле&shy;живаемости</th>
        <th colspan="2">Коли&shy;чественная единица измерения в целях просле&shy;живаемости</th>
        <th rowspan="2">Коли&shy;чество товара, подлежа&shy;щего просле&shy;живаемости</th>
        <th rowspan="2">Стоимость товара, подлежа&shy;щего просле&shy;живаемости, без НДС, в рублях</th>
      </tr>
      <tr>
        <th>код</th>
        <th>условное обозна&shy;чение</th>
        <th>циф&shy;ровой код</th>
        <th>краткое наимено&shy;вание</th>
        <th>код</th>
        <th>условное обозна&shy;чение</th>
      </tr>
      <tr>
        <th>А</th><th>Б</th><th>1</th><th>1а</th><th>1б</th><th>2</th><th>2а</th>
        <th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th>
        <th>10</th><th>10а</th><th>11</th><th>12</th><th>12а</th><th>13</th><th>14</th>
      </tr>
    </thead>
    <tbody>
      <!-- BEGIN line -->
      <tr>
        <td class="col-no">{{row_number}}</td>
        <td class="ctr">{{item_code}}</td>
        <td class="col-no">{{row_number}}</td>
        <td>{{item_name}}</td>
        <td class="ctr">—</td>
        <td class="ctr">{{unit_code}}</td>
        <td class="ctr">{{unit_label}}</td>
        <td class="num">{{quantity}}</td>
        <td class="num">{{price}}</td>
        <td class="num">{{amount_net}}</td>
        <td class="ctr">{{excise}}</td>
        <td class="ctr">{{vat_rate}}</td>
        <td class="num">{{vat_amount}}</td>
        <td class="num">{{amount_gross}}</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
        <td class="ctr">—</td>
      </tr>
      <!-- END line -->
      <tr class="totals-row">
        <td colspan="9" class="totals-label">Всего к оплате</td>
        <td class="num">{{total_net}}</td>
        <td colspan="2" class="ctr">Х</td>
        <td class="num">{{total_vat}}</td>
        <td class="num">{{total_gross}}</td>
        <td colspan="7" class="no-border"></td>
      </tr>
    </tbody>
  </table>

  <!-- Сумма прописью (дополнение рекомендуемой формы) -->
  <div class="summary">
    <div>Всего наименований {{items_count}}, на сумму {{total_gross}} руб.</div>
    <div class="in-words">{{amount_in_words}}</div>
  </div>

  <!-- Подписи СФ-части -->
  <table class="sf-signatures">
    <tr>
      <td class="s-role">Руководитель организации<br>или иное уполномоченное лицо</td>
      <td class="s-line">&nbsp;</td>
      <td class="s-gap"></td>
      <td class="s-name">{{director_name}}</td>
      <td class="s-gap"></td>
      <td class="s-role">Главный бухгалтер<br>или иное уполномоченное лицо</td>
      <td class="s-line">&nbsp;</td>
      <td class="s-gap"></td>
      <td class="s-name">{{accountant_name}}</td>
    </tr>
    <tr>
      <td></td>
      <td class="s-caption">(подпись)</td>
      <td></td>
      <td class="s-caption">(ф.и.о.)</td>
      <td></td>
      <td></td>
      <td class="s-caption">(подпись)</td>
      <td></td>
      <td class="s-caption">(ф.и.о.)</td>
    </tr>
  </table>

  <!-- Передаточная часть (строки [8]–[19]) -->
  <hr class="transfer-rule">
  <table class="transfer-lines">
    <tr>
      <td class="h-label" style="white-space: nowrap; padding-right: 2mm;">Основание передачи (сдачи) / получения (приёмки):</td>
      <td class="t-value-line">{{transfer_basis}}</td>
      <td class="h-no" style="white-space: nowrap; padding-left: 1.5mm; font-size: 7pt;">[8]</td>
    </tr>
    <tr>
      <td class="h-label" style="white-space: nowrap; padding-right: 2mm;">Данные о транспортировке и грузе:</td>
      <td class="t-value-line">{{transport_info}}</td>
      <td class="h-no" style="white-space: nowrap; padding-left: 1.5mm; font-size: 7pt;">[9]</td>
    </tr>
  </table>

  <table class="transfer-cols">
    <tr>
      <td class="t-col-left">
        <div class="t-block">
          <div>Товар (груз) передал / услуги, результаты работ, права сдал</div>
          <table class="t-sign">
            <tr>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-name">{{transferred_by_name}}</td>
              <td style="padding-left: 1.5mm; font-size: 7pt;">[10]</td>
            </tr>
            <tr>
              <td class="t-caption" style="text-align: center;">(должность)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(подпись)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(ф.и.о.)</td>
              <td></td>
            </tr>
          </table>
        </div>
        <div class="t-block">Дата отгрузки, передачи (сдачи): <b>{{shipping_date}}</b> <span style="font-size: 7pt;">[11]</span></div>
        <div class="t-block">Иные сведения об отгрузке, передаче: — <span style="font-size: 7pt;">[12]</span></div>
        <div class="t-block">
          <div>Ответственный за правильность оформления факта хозяйственной жизни</div>
          <table class="t-sign">
            <tr>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-name">{{seller_responsible_name}}</td>
              <td style="padding-left: 1.5mm; font-size: 7pt;">[13]</td>
            </tr>
            <tr>
              <td class="t-caption" style="text-align: center;">(должность)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(подпись)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(ф.и.о.)</td>
              <td></td>
            </tr>
          </table>
        </div>
        <div class="t-block">
          <div>Наименование экономического субъекта — составителя документа (в т. ч. комиссионера / агента)</div>
          <div class="t-value-line">{{seller_composer}}&nbsp;<span style="font-weight: normal; font-size: 7pt;">[14]</span></div>
        </div>
        <div class="stamp">М.П.</div>
      </td>
      <td class="t-col-right">
        <div class="t-block">
          <div>Товар (груз) получил / услуги, результаты работ, права принял</div>
          <table class="t-sign">
            <tr>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-name">&nbsp;</td>
              <td style="padding-left: 1.5mm; font-size: 7pt;">[15]</td>
            </tr>
            <tr>
              <td class="t-caption" style="text-align: center;">(должность)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(подпись)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(ф.и.о.)</td>
              <td></td>
            </tr>
          </table>
        </div>
        <div class="t-block">Дата получения (приёмки): «____» ______________ 20___ г. <span style="font-size: 7pt;">[16]</span></div>
        <div class="t-block">Иные сведения о получении, приёмке: — <span style="font-size: 7pt;">[17]</span></div>
        <div class="t-block">
          <div>Ответственный за правильность оформления факта хозяйственной жизни</div>
          <table class="t-sign">
            <tr>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-line">&nbsp;</td>
              <td class="t-gap"></td>
              <td class="t-name">&nbsp;</td>
              <td style="padding-left: 1.5mm; font-size: 7pt;">[18]</td>
            </tr>
            <tr>
              <td class="t-caption" style="text-align: center;">(должность)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(подпись)</td>
              <td></td>
              <td class="t-caption" style="text-align: center;">(ф.и.о.)</td>
              <td></td>
            </tr>
          </table>
        </div>
        <div class="t-block">
          <div>Наименование экономического субъекта — составителя документа</div>
          <div class="t-value-line">{{buyer_composer}}&nbsp;<span style="font-weight: normal; font-size: 7pt;">[19]</span></div>
        </div>
        <div class="stamp">М.П.</div>
      </td>
    </tr>
  </table>

</div>
</body>
</html>
`;
