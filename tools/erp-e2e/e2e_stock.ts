// E2E цикла склада ERPilot: 2 поступления (скользящая средняя) -> реализация
// (списание по средней, guard строки, печать УПД, сторно) -> перемещение между
// складами -> списание -> нехватка остатка -> guard отмены поступления в минус.
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_stock.ts
// (сервер на :3000, workspace ERP Dev, dev-логин).
// Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
// TS-порт e2e_stock.py (директива Антона 26.08: весь наш код на TS).

import {
  BASE,
  findName,
  getExtensionMessage,
  gql,
  gqlRaw,
  login,
  money,
  mutationNames,
} from './lib/e2e-client';

type Id = { id: string };

function randomSuffix(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

type StockLedgerNode = {
  actualQty: number;
  qtyAfter: number;
  valuationRate: { amountMicros: string };
  voucherType: string;
  voucherId: string;
  isCancelled: boolean;
  isCancellation: boolean;
};

async function main() {
  const token = await login();
  console.log('auth ok');
  const names = await mutationNames(token);

  const createOrg = findName(names, 'createOrganization');
  const createWarehouse = findName(names, 'createWarehouse');
  const createItem = findName(names, 'createItem');
  const createGr = findName(names, 'createGoodsReceipt');
  const createGrLine = findName(names, 'createGoodsReceiptLine');
  const createSs = findName(names, 'createSalesShipment');
  const createSsLine = findName(names, 'createSalesShipmentLine');
  const updateSsLine = findName(names, 'updateSalesShipmentLine');
  const updateSs = findName(names, 'updateSalesShipment');
  const createTr = findName(names, 'createStockTransfer');
  const createTrLine = findName(names, 'createStockTransferLine');
  const createWo = findName(names, 'createGoodsWriteOff');
  const createWoLine = findName(names, 'createGoodsWriteOffLine');
  console.log('mutations:', createGr, createSs, createTr, createWo);

  // уникальный суффикс на прогон — записи разных запусков не смешиваются
  const suffix = randomSuffix();

  // 1. Организация + 2 склада + товар
  const org = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createOrg}(data: {
      name: "ООО Склад-Тест (e2e ${suffix})", inn: "7728168971", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }) { id } }`,
      {},
      token,
    )
  )[createOrg];
  console.log('org:', org.id);

  const w1 = (
    await gql<Record<string, { id: string; name: string }>>(
      '/graphql',
      `mutation { ${createWarehouse}(data: { name: "Склад №1 (e2e ${suffix})" }) { id name } }`,
      {},
      token,
    )
  )[createWarehouse];
  const w2 = (
    await gql<Record<string, { id: string; name: string }>>(
      '/graphql',
      `mutation { ${createWarehouse}(data: { name: "Склад №2 (e2e ${suffix})" }) { id name } }`,
      {},
      token,
    )
  )[createWarehouse];
  console.log('warehouses:', w1.id, w2.id);

  const itemName = `Товар А (e2e ${suffix})`;
  const item = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createItem}(data: { name: "${itemName}", itemType: "GOODS", unit: "PIECE" }) { id } }`,
      {},
      token,
    )
  )[createItem];
  console.log('item:', item.id);

  async function itemBalance(
    warehouseId: string,
  ): Promise<{ actualQty: number; avgCost: { amountMicros: string } }> {
    const d = await gql<{
      itemBalance: { actualQty: number; avgCost: { amountMicros: string } };
    }>(
      '/graphql',
      `{ itemBalance(filter: {
          itemId: { eq: "${item.id}" }, warehouseId: { eq: "${warehouseId}" }
        }) { actualQty avgCost { amountMicros } } }`,
      {},
      token,
    );

    return d.itemBalance;
  }

  async function ledgerEntries(
    warehouseId?: string,
    voucherId?: string,
  ): Promise<StockLedgerNode[]> {
    const parts = [`itemId: { eq: "${item.id}" }`];

    if (warehouseId) parts.push(`warehouseId: { eq: "${warehouseId}" }`);
    if (voucherId) parts.push(`voucherId: { eq: "${voucherId}" }`);

    const d = await gql<{
      stockLedgerEntries: { edges: { node: StockLedgerNode }[] };
    }>(
      '/graphql',
      `{ stockLedgerEntries(filter: { ${parts.join(', ')} }) {
          edges { node { actualQty qtyAfter valuationRate { amountMicros }
            voucherType voucherId isCancelled isCancellation } } } }`,
      {},
      token,
    );

    return d.stockLedgerEntries.edges.map((e) => e.node);
  }

  // 2. Поступление 1: 10 x 100 -> остаток 10, средняя 100
  const gr1 = (
    await gql<Record<string, { id: string; docStatus: string }>>(
      '/graphql',
      `mutation { ${createGr}(data: { organizationId: "${org.id}", warehouseId: "${w1.id}" }) { id docStatus } }`,
      {},
      token,
    )
  )[createGr];
  await gql(
    '/graphql',
    `mutation { ${createGrLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 10,
      price: ${money(100)}, goodsReceiptId: "${gr1.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "goodsReceipt", recordId: "${gr1.id}") }`,
    {},
    token,
  );
  const gr1q = (
    await gql<{
      goodsReceipt: {
        number: string;
        docStatus: string;
        total: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ goodsReceipt(filter: { id: { eq: "${gr1.id}" } }) {
      number docStatus total { amountMicros } } }`,
      {},
      token,
    )
  ).goodsReceipt;
  if (!gr1q.number.startsWith('GR-'))
    throw new Error(`unexpected: ${JSON.stringify(gr1q)}`);
  if (gr1q.docStatus !== 'POSTED')
    throw new Error(`unexpected: ${JSON.stringify(gr1q)}`);
  if (Number(gr1q.total.amountMicros) / 1e6 !== 1000)
    throw new Error(`unexpected: ${JSON.stringify(gr1q)}`);
  let bal = await itemBalance(w1.id);
  if (bal.actualQty !== 10)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  if (Number(bal.avgCost.amountMicros) / 1e6 !== 100)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  console.log(`GR1 ${gr1q.number} POSTED, total=1000, w1: qty=10 avg=100 ok`);

  // Регистр движений (не только остаток): ровно одна строка по GR1, +10,
  // qtyAfter 10, себестоимость за ед. 100, ссылается на GR1.
  const gr1Rows = await ledgerEntries(w1.id, gr1.id);
  if (gr1Rows.length !== 1)
    throw new Error(`unexpected: ${JSON.stringify(gr1Rows)}`);
  const gr1Row = gr1Rows[0];
  if (gr1Row.actualQty !== 10)
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  if (gr1Row.qtyAfter !== 10)
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  if (Number(gr1Row.valuationRate.amountMicros) / 1e6 !== 100)
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  if (gr1Row.voucherType !== 'goodsReceipt')
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  if (gr1Row.voucherId !== gr1.id)
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  if (gr1Row.isCancellation !== false)
    throw new Error(`unexpected: ${JSON.stringify(gr1Row)}`);
  console.log(
    'stockLedgerEntry GR1: 1 row, +10, qtyAfter=10, valuationRate=100 ok',
  );

  // 3. Поступление 2: 10 x 200 -> остаток 20, средняя (1000+2000)/20=150
  const gr2 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createGr}(data: { organizationId: "${org.id}", warehouseId: "${w1.id}" }) { id } }`,
      {},
      token,
    )
  )[createGr];
  await gql(
    '/graphql',
    `mutation { ${createGrLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 10,
      price: ${money(200)}, goodsReceiptId: "${gr2.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "goodsReceipt", recordId: "${gr2.id}") }`,
    {},
    token,
  );
  bal = await itemBalance(w1.id);
  if (bal.actualQty !== 20)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  if (Number(bal.avgCost.amountMicros) / 1e6 !== 150)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  console.log('GR2 POSTED, w1: qty=20 avg=150 ok');

  // 4. Реализация 4 шт по продажной цене 610 (с НДС 22%) -> списание по
  // средней 150: costAmount=600, остаток w1=16
  const ss1 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSs}(data: { organizationId: "${org.id}", warehouseId: "${w1.id}" }) { id } }`,
      {},
      token,
    )
  )[createSs];
  const ss1Line = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSsLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 4,
      price: ${money(610)}, amount: ${money(2440)}, vatRate: "VAT_22",
      salesShipmentId: "${ss1.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSsLine];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesShipment", recordId: "${ss1.id}") }`,
    {},
    token,
  );
  const ss1q = (
    await gql<{
      salesShipment: {
        number: string;
        docStatus: string;
        totalCost: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesShipment(filter: { id: { eq: "${ss1.id}" } }) {
      number docStatus totalCost { amountMicros } } }`,
      {},
      token,
    )
  ).salesShipment;
  if (!ss1q.number.startsWith('SH-'))
    throw new Error(`unexpected: ${JSON.stringify(ss1q)}`);
  if (Number(ss1q.totalCost.amountMicros) / 1e6 !== 600)
    throw new Error(`unexpected: ${JSON.stringify(ss1q)}`);
  const lineQ = (
    await gql<{
      salesShipmentLine: {
        costAmount: { amountMicros: string };
        amount: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesShipmentLine(filter: { id: { eq: "${ss1Line.id}" } }) {
      costAmount { amountMicros } amount { amountMicros } } }`,
      {},
      token,
    )
  ).salesShipmentLine;
  if (Number(lineQ.costAmount.amountMicros) / 1e6 !== 600)
    throw new Error(`unexpected: ${JSON.stringify(lineQ)}`);
  if (Number(lineQ.amount.amountMicros) / 1e6 !== 2440)
    throw new Error(`unexpected: ${JSON.stringify(lineQ)}`);
  bal = await itemBalance(w1.id);
  if (bal.actualQty !== 16)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  console.log(
    `SS1 ${ss1q.number} POSTED, costAmount=600, sale amount=2440, w1: qty=16 ok`,
  );

  // 5. Перемещение 5 шт w1 -> w2: остатки 11 / 5, средняя переносится (150)
  const tr = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createTr}(data: { organizationId: "${org.id}", warehouseFromId: "${w1.id}", warehouseToId: "${w2.id}" }) { id } }`,
      {},
      token,
    )
  )[createTr];
  await gql(
    '/graphql',
    `mutation { ${createTrLine}(data: { name: "${itemName}", itemId: "${item.id}", quantity: 5, stockTransferId: "${tr.id}" }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "stockTransfer", recordId: "${tr.id}") }`,
    {},
    token,
  );
  const [bal1, bal2] = [await itemBalance(w1.id), await itemBalance(w2.id)];
  if (bal1.actualQty !== 11)
    throw new Error(`unexpected: ${JSON.stringify(bal1)}`);
  if (bal2.actualQty !== 5)
    throw new Error(`unexpected: ${JSON.stringify(bal2)}`);
  if (Number(bal2.avgCost.amountMicros) / 1e6 !== 150)
    throw new Error(`unexpected: ${JSON.stringify(bal2)}`);
  console.log('Transfer POSTED, w1: qty=11, w2: qty=5 avg=150 ok');

  // 6. Списание 2 шт с w1 -> остаток 9
  const wo = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createWo}(data: { organizationId: "${org.id}", warehouseId: "${w1.id}" }) { id } }`,
      {},
      token,
    )
  )[createWo];
  await gql(
    '/graphql',
    `mutation { ${createWoLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 2, reason: "Порча (e2e)",
      goodsWriteOffId: "${wo.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "goodsWriteOff", recordId: "${wo.id}") }`,
    {},
    token,
  );
  bal = await itemBalance(w1.id);
  if (bal.actualQty !== 9)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  console.log('WriteOff POSTED, w1: qty=9 ok');

  // 7. Попытка реализовать 100 шт с w1 (доступно 9) -> RU-ошибка нехватки
  // с именем товара и склада
  const ss2 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSs}(data: { organizationId: "${org.id}", warehouseId: "${w1.id}" }) { id } }`,
      {},
      token,
    )
  )[createSs];
  await gql(
    '/graphql',
    `mutation { ${createSsLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 100,
      price: ${money(610)}, amount: ${money(61000)}, vatRate: "VAT_22",
      salesShipmentId: "${ss2.id}"
    }) { id } }`,
    {},
    token,
  );
  let fail = await gqlRaw(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesShipment", recordId: "${ss2.id}") }`,
    {},
    token,
  );
  let failMsg = getExtensionMessage(fail);
  if (!failMsg.includes(itemName)) throw new Error(failMsg);
  if (!failMsg.includes(w1.name)) throw new Error(failMsg);
  if (!(failMsg.includes('9') && failMsg.includes('100')))
    throw new Error(failMsg);
  console.log('insufficient stock (100 > 9) blocked:', failMsg.slice(0, 140));

  // 8. Отмена ПЕРВОГО поступления невозможна: списать бы пришлось 10, а на
  // складе после операций 9 (20-4-5-2) -> ушло бы в минус
  fail = await gqlRaw(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "goodsReceipt", recordId: "${gr1.id}") }`,
    {},
    token,
  );
  failMsg = getExtensionMessage(fail);
  if (!failMsg.includes(itemName)) throw new Error(failMsg);
  if (!(failMsg.includes('9') && failMsg.includes('10')))
    throw new Error(failMsg);
  console.log('cancel GR1 blocked (would go negative):', failMsg.slice(0, 140));
  bal = await itemBalance(w1.id);
  if (bal.actualQty !== 9)
    throw new Error(
      'GR1 cancel attempt must not have side effects: ' + JSON.stringify(bal),
    );

  // 9. Guard: правка документа и строки проведённой реализации -> ошибка
  const guardDoc = await gqlRaw(
    '/graphql',
    `mutation { ${updateSs}(id: "${ss1.id}", data: { comment: "hack" }) { id } }`,
    {},
    token,
  );
  if (!guardDoc.errors)
    throw new Error('guard DID NOT block edit of POSTED salesShipment!');
  console.log(
    'guard blocks edit of POSTED salesShipment ok:',
    getExtensionMessage(guardDoc).slice(0, 80),
  );

  const guardLine = await gqlRaw(
    '/graphql',
    `mutation { ${updateSsLine}(id: "${ss1Line.id}", data: { quantity: 999 }) { id } }`,
    {},
    token,
  );
  if (!guardLine.errors)
    throw new Error(
      'guard DID NOT block edit of a line of POSTED salesShipment!',
    );
  console.log(
    'guard blocks edit of line of POSTED salesShipment ok:',
    getExtensionMessage(guardLine).slice(0, 80),
  );

  // 10. Печать УПД: 200 (status по умолчанию 2), status=1, невалидный статус -> 4xx
  async function fetchUpd(statusQs = ''): Promise<Response> {
    return fetch(
      `${BASE}/rest/erp/sales-shipments/${ss1.id}/print-upd${statusQs}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  }

  const defaultRes = await fetchUpd();
  const htmlDefault = await defaultRes.text();
  if (defaultRes.status !== 200)
    throw new Error(`unexpected status ${defaultRes.status}`);
  if (!htmlDefault.includes(itemName))
    throw new Error('УПД must contain item name');
  const grossTotalRu = '2 440,00';
  if (
    !htmlDefault.includes(grossTotalRu) &&
    !htmlDefault.includes('2 440,00')
  ) {
    throw new Error(`УПД must contain gross total "2 440,00"`);
  }
  console.log(
    `print-upd status=2 (default): 200, contains item + total 2 440,00 (${htmlDefault.length} bytes)`,
  );

  const status1Res = await fetchUpd('?status=1');
  if (status1Res.status !== 200)
    throw new Error(`unexpected status ${status1Res.status}`);
  await status1Res.text();
  console.log('print-upd status=1: 200 ok');

  const invalidRes = await fetchUpd('?status=9');
  if (invalidRes.status >= 200 && invalidRes.status < 300) {
    throw new Error('print-upd with invalid status must NOT return 200');
  }
  if (!(invalidRes.status >= 400 && invalidRes.status < 500)) {
    throw new Error(`invalid status must be 4xx, got ${invalidRes.status}`);
  }
  console.log(`print-upd status=9 (invalid): HTTP ${invalidRes.status} ok`);

  // 11. Сторно реализации -> остаток w1 возвращается 9+4=13, документ снова DRAFT
  await gql(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "salesShipment", recordId: "${ss1.id}") }`,
    {},
    token,
  );
  const ss1After = (
    await gql<{
      salesShipment: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
      };
    }>(
      '/graphql',
      `{ salesShipment(filter: { id: { eq: "${ss1.id}" } }) { docStatus postedAt cancelledAt } }`,
      {},
      token,
    )
  ).salesShipment;
  if (ss1After.docStatus !== 'DRAFT')
    throw new Error(`unexpected: ${JSON.stringify(ss1After)}`);
  if (ss1After.postedAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(ss1After)}`);
  if (ss1After.cancelledAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(ss1After)}`);
  bal = await itemBalance(w1.id);
  if (bal.actualQty !== 13)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  if (Number(bal.avgCost.amountMicros) / 1e6 !== 150)
    throw new Error(`unexpected: ${JSON.stringify(bal)}`);
  console.log(
    'storno SS1 ok: docStatus=DRAFT (возвращён в черновик), w1: qty=13 (9+4) avg=150 ok',
  );

  // Регистр движений после сторно: исходная строка (-4) + реверс-строка
  // (isCancellation=true, +4) по одному и тому же voucherId; сумма = 0.
  const ss1Rows = await ledgerEntries(w1.id, ss1.id);
  const originals = ss1Rows.filter((r) => !r.isCancellation);
  const reversals = ss1Rows.filter((r) => r.isCancellation);
  if (originals.length !== 1 || reversals.length !== 1)
    throw new Error(`unexpected: ${JSON.stringify(ss1Rows)}`);
  if (originals[0].actualQty !== -4)
    throw new Error(`unexpected: ${JSON.stringify(originals)}`);
  if (reversals[0].actualQty !== 4)
    throw new Error(`unexpected: ${JSON.stringify(reversals)}`);
  if (!ss1Rows.every((r) => r.voucherId === ss1.id))
    throw new Error(`unexpected: ${JSON.stringify(ss1Rows)}`);
  if (ss1Rows.reduce((s, r) => s + r.actualQty, 0) !== 0)
    throw new Error(`unexpected: ${JSON.stringify(ss1Rows)}`);
  console.log(
    'stockLedgerEntry SS1 storno: original -4 + reversal +4, sum=0 ok',
  );

  console.log('\n=== E2E ЦИКЛ СКЛАДА ПРОЙДЕН ===');
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(2);
});
