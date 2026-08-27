// E2E цикла бухгалтерии ERPilot: поступление -> счёт покупателю (НДС 22%) ->
// реализация -> оплата -> ручная операция -> ОСВ -> lockDate (отказы) ->
// импорт банковской выписки (CP1251, идемпотентность) -> сторно ручной
// операции (проводки реверсированы).
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_accounting.ts
// (сервер на :3000, workspace ERP Dev, dev-логин).
// Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
// TS-порт e2e_accounting.py (директива Антона 26.08: весь наш код на TS).
//
// CP1251-фикстура выписки: переиспользуем серверную utility вместо
// добавления iconv-lite как зависимости — та же причина, что и в самом
// сервере (см. decode-cp1251.util.ts: "iconv-lite is not a twenty-server
// dependency").
import { encodeCp1251 } from '../../packages/twenty-server/src/engine/core-modules/erp-accounting/utils/decode-cp1251.util';
import {
  BASE,
  findName,
  getExtensionMessage,
  gql,
  gqlRaw,
  login,
  mcpToolCall,
  mcpToolResultJson,
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

function randomInn(): string {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join(
    '',
  );
}

type GlEntryNode = {
  amount: { amountMicros: string };
  isCancelled: boolean;
  isCancellation: boolean;
  debitAccount: { code: string };
  creditAccount: { code: string };
};

async function main() {
  const token = await login();
  console.log('auth ok');
  const names = await mutationNames(token);

  const createOrg = findName(names, 'createOrganization');
  const updateOrg = findName(names, 'updateOrganization');
  const createCompany = findName(names, 'createCompany');
  const createItem = findName(names, 'createItem');
  const createWarehouse = findName(names, 'createWarehouse');
  const createGr = findName(names, 'createGoodsReceipt');
  const createGrLine = findName(names, 'createGoodsReceiptLine');
  const createSinv = findName(names, 'createSalesInvoice');
  const createSinvLine = findName(names, 'createSalesInvoiceLine');
  const createSs = findName(names, 'createSalesShipment');
  const createSsLine = findName(names, 'createSalesShipmentLine');
  const createPayment = findName(names, 'createPayment');
  const createMe = findName(names, 'createManualEntry');
  const createMeLine = findName(names, 'createManualEntryLine');
  console.log(
    'mutations:',
    createOrg,
    createSinv,
    createSs,
    createPayment,
    createMe,
  );

  const suffix = randomSuffix();

  // 0. План счетов: коды -> id (справочник уже засеян post-install приложения).
  const accRows = (
    await gql<{
      accounts: { edges: { node: { id: string; code: string } }[] };
    }>(
      '/graphql',
      '{ accounts(first: 200) { edges { node { id code } } } }',
      {},
      token,
    )
  ).accounts.edges;
  const accounts = Object.fromEntries(
    accRows.map((e) => [e.node.code, e.node.id]),
  );

  for (const code of [
    '41.01',
    '60.01',
    '62.01',
    '90.01.1',
    '90.02.1',
    '90.03',
    '68.02',
    '51',
    '26',
    '71',
  ]) {
    if (!(code in accounts))
      throw new Error(`account ${code} missing from chart of accounts`);
  }

  async function glEntries(voucherId: string): Promise<GlEntryNode[]> {
    const d = await gql<{ glEntries: { edges: { node: GlEntryNode }[] } }>(
      '/graphql',
      `{ glEntries(filter: { voucherId: { eq: "${voucherId}" } }) {
          edges { node { amount { amountMicros } isCancelled isCancellation
            debitAccount { code } creditAccount { code } } } } }`,
      {},
      token,
    );

    return d.glEntries.edges.map((e) => e.node);
  }

  function assertGlRow(
    rows: GlEntryNode[],
    debitCode: string,
    creditCode: string,
    amountRub: number,
    label: string,
  ) {
    const live = rows.filter((r) => !r.isCancelled && !r.isCancellation);
    const matches = live.filter(
      (r) =>
        r.debitAccount.code === debitCode &&
        r.creditAccount.code === creditCode,
    );

    if (matches.length !== 1)
      throw new Error(
        `${label}: expected 1 row Дт${debitCode}/Кт${creditCode}, got ${JSON.stringify(rows)}`,
      );

    const got = Number(matches[0].amount.amountMicros) / 1e6;

    if (got !== amountRub)
      throw new Error(
        `${label}: Дт${debitCode}/Кт${creditCode} expected ${amountRub}, got ${got}`,
      );
  }

  // 1. Организация (свежий ИНН — нужен для импорта выписки) + контрагент + товар + склад.
  const orgInn = randomInn();
  const org = (
    await gql<Record<string, { id: string; name: string }>>(
      '/graphql',
      `mutation { ${createOrg}(data: {
      name: "ООО Бухгалтерия-Тест (e2e ${suffix})", inn: "${orgInn}", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }) { id name } }`,
      {},
      token,
    )
  )[createOrg];
  console.log('org:', org.id, 'inn', orgInn);

  const counterpartyInn = randomInn();
  const comp = (
    await gql<Record<string, { id: string; name: string }>>(
      '/graphql',
      `mutation { ${createCompany}(data: {
      name: "ООО Контрагент (e2e ${suffix})", inn: "${counterpartyInn}",
      isCustomer: true, isSupplier: true
    }) { id name } }`,
      {},
      token,
    )
  )[createCompany];
  console.log('counterparty:', comp.id, 'inn', counterpartyInn);

  const warehouse = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createWarehouse}(data: { name: "Склад Бух (e2e ${suffix})" }) { id } }`,
      {},
      token,
    )
  )[createWarehouse];

  const itemName = `Товар для бухгалтерии (e2e ${suffix})`;
  const item = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createItem}(data: { name: "${itemName}", itemType: "GOODS", unit: "PIECE" }) { id } }`,
      {},
      token,
    )
  )[createItem];
  console.log('warehouse:', warehouse.id, '| item:', item.id);

  // 2. Поступление 10 x 100 -> проведение -> Дт41.01/Кт60.01 = 1000.
  const gr = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createGr}(data: { organizationId: "${org.id}", warehouseId: "${warehouse.id}" }) { id } }`,
      {},
      token,
    )
  )[createGr];
  await gql(
    '/graphql',
    `mutation { ${createGrLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 10,
      price: ${money(100)}, goodsReceiptId: "${gr.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "goodsReceipt", recordId: "${gr.id}") }`,
    {},
    token,
  );
  const grRows = await glEntries(gr.id);
  assertGlRow(grRows, '41.01', '60.01', 1000, 'GR');
  console.log('GR POSTED: Дт41.01/Кт60.01=1000 ok');

  // 3. Счёт покупателю 1220 с НДС 22% -> Дт62.01/Кт90.01.1=1220, Дт90.03/Кт68.02=220
  //    (1220 x 22 / 122 = 220 ровно).
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const sinv = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSinv}(data: {
      name: "Черновик e2e", invoiceDate: "${todayIso}",
      organizationId: "${org.id}", customerId: "${comp.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSinv];
  await gql(
    '/graphql',
    `mutation { ${createSinvLine}(data: {
      name: "${itemName}", quantity: 1,
      price: ${money(1220)}, vatRate: "VAT_22", salesInvoiceId: "${sinv.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesInvoice", recordId: "${sinv.id}") }`,
    {},
    token,
  );
  const sinvQ = (
    await gql<{
      salesInvoice: {
        total: { amountMicros: string };
        vatTotal: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${sinv.id}" } }) {
      total { amountMicros } vatTotal { amountMicros } } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (Number(sinvQ.total.amountMicros) / 1e6 !== 1220)
    throw new Error(`unexpected: ${JSON.stringify(sinvQ)}`);
  if (Number(sinvQ.vatTotal.amountMicros) / 1e6 !== 220)
    throw new Error(`unexpected: ${JSON.stringify(sinvQ)}`);
  const sinvRows = await glEntries(sinv.id);
  assertGlRow(sinvRows, '62.01', '90.01.1', 1220, 'SalesInvoice');
  assertGlRow(sinvRows, '90.03', '68.02', 220, 'SalesInvoice VAT');
  console.log(
    'SalesInvoice POSTED: Дт62.01/Кт90.01.1=1220, Дт90.03/Кт68.02=220 ok',
  );

  // 4. Реализация 4 шт (средняя себестоимость 100, единственное поступление)
  //    -> Дт90.02.1/Кт41.01 = 400.
  const ss = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSs}(data: {
      organizationId: "${org.id}", warehouseId: "${warehouse.id}",
      customerId: "${comp.id}", salesInvoiceId: "${sinv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSs];
  await gql(
    '/graphql',
    `mutation { ${createSsLine}(data: {
      name: "${itemName}", itemId: "${item.id}", quantity: 4,
      price: ${money(305)}, amount: ${money(1220)}, vatRate: "VAT_22",
      salesShipmentId: "${ss.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesShipment", recordId: "${ss.id}") }`,
    {},
    token,
  );
  const ssQ = (
    await gql<{ salesShipment: { totalCost: { amountMicros: string } } }>(
      '/graphql',
      `{ salesShipment(filter: { id: { eq: "${ss.id}" } }) { totalCost { amountMicros } } }`,
      {},
      token,
    )
  ).salesShipment;
  if (Number(ssQ.totalCost.amountMicros) / 1e6 !== 400)
    throw new Error(`unexpected: ${JSON.stringify(ssQ)}`);
  const ssRows = await glEntries(ss.id);
  assertGlRow(ssRows, '90.02.1', '41.01', 400, 'SalesShipment');
  console.log(
    'SalesShipment POSTED: Дт90.02.1/Кт41.01=400 (по средней 100) ok',
  );

  // 5. Оплата 1220 -> Дт51/Кт62.01 = 1220.
  const pay = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createPayment}(data: {
      name: "Оплата (e2e)", paymentDate: "${todayIso}",
      amount: ${money(1220)}, organizationId: "${org.id}",
      payerId: "${comp.id}", salesInvoiceId: "${sinv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createPayment];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "payment", recordId: "${pay.id}") }`,
    {},
    token,
  );
  const payRows = await glEntries(pay.id);
  assertGlRow(payRows, '51', '62.01', 1220, 'Payment');
  const sinvAfterPay = (
    await gql<{ salesInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${sinv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (sinvAfterPay.paymentStatus !== 'PAID')
    throw new Error(`unexpected: ${JSON.stringify(sinvAfterPay)}`);
  console.log('Payment POSTED: Дт51/Кт62.01=1220 ok, invoice PAID');

  // 6. Ручная операция Дт26 Кт71 500 (эта же операция сторнируется в конце).
  const me = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createMe}(data: { organizationId: "${org.id}" }) { id } }`,
      {},
      token,
    )
  )[createMe];
  await gql(
    '/graphql',
    `mutation { ${createMeLine}(data: {
      name: "Списание подотчётных сумм (e2e)", amount: ${money(500)},
      debitAccountId: "${accounts['26']}", creditAccountId: "${accounts['71']}",
      manualEntryId: "${me.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "manualEntry", recordId: "${me.id}") }`,
    {},
    token,
  );
  const meQ = (
    await gql<{ manualEntry: { number: string; docStatus: string } }>(
      '/graphql',
      `{ manualEntry(filter: { id: { eq: "${me.id}" } }) { number docStatus } }`,
      {},
      token,
    )
  ).manualEntry;
  if (!meQ.number.startsWith('ME-'))
    throw new Error(`unexpected: ${JSON.stringify(meQ)}`);
  if (meQ.docStatus !== 'POSTED')
    throw new Error(`unexpected: ${JSON.stringify(meQ)}`);
  const meRows = await glEntries(me.id);
  assertGlRow(meRows, '26', '71', 500, 'ManualEntry');
  console.log(`ManualEntry ${meQ.number} POSTED: Дт26/Кт71=500 ok`);

  // 7. ОСВ за сегодня (все проводки датированы датой проведения = сегодня,
  //    т.к. postingDate ни у одного из документов выше не задавался явно).
  //    Ручной расчёт: обороты Дт = обороты Кт = 1000+1220+220+400+1220+500 = 4560;
  //    сальдо 41.01 = 1000-400=600; 62.01 = 1220-1220=0; 51 = 1220 (единственное движение).
  const rpc = await mcpToolCall(token, 'trial_balance', {
    organizationId: org.id,
    dateFrom: todayIso,
    dateTo: todayIso,
  });

  if (!rpc.result || rpc.result.isError)
    throw new Error(`unexpected: ${JSON.stringify(rpc)}`);

  const tb = mcpToolResultJson(rpc) as {
    totals: { turnoverDebit: number; turnoverCredit: number };
    rows: {
      accountCode: string;
      closingDebit: number;
      closingCredit: number;
    }[];
  };

  if (
    !(
      tb.totals.turnoverDebit === tb.totals.turnoverCredit &&
      tb.totals.turnoverDebit === 456000
    )
  ) {
    throw new Error(
      `turnover Дт/Кт expected 4560.00 each, got ${JSON.stringify(tb.totals)}`,
    );
  }

  const byCode = Object.fromEntries(
    tb.rows.map((row) => [row.accountCode, row]),
  );

  function closingBalanceKopecks(code: string): number {
    const row = byCode[code];

    return row.closingDebit - row.closingCredit;
  }

  if (closingBalanceKopecks('41.01') !== 60000)
    throw new Error(JSON.stringify(byCode['41.01'])); // 600 руб
  if (closingBalanceKopecks('62.01') !== 0)
    throw new Error(JSON.stringify(byCode['62.01']));
  if (closingBalanceKopecks('51') !== 122000)
    throw new Error(JSON.stringify(byCode['51'])); // 1220 руб
  console.log(
    `ОСВ (MCP trial_balance) ok: обороты Дт=Кт=${tb.totals.turnoverDebit / 100} руб, ` +
      `41.01=${closingBalanceKopecks('41.01') / 100}, 62.01=${closingBalanceKopecks('62.01') / 100}, ` +
      `51=${closingBalanceKopecks('51') / 100}`,
  );

  // 8. lockDate: отдельная ручная операция с postingDate=вчера, проводится
  //    ПОКА lockDate ещё не установлен (период открыт).
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(today);
  dayBefore.setDate(dayBefore.getDate() - 2);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);
  const dayBeforeIso = dayBefore.toISOString().slice(0, 10);

  const lockMe = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createMe}(data: { organizationId: "${org.id}", postingDate: "${yesterdayIso}" }) { id } }`,
      {},
      token,
    )
  )[createMe];
  await gql(
    '/graphql',
    `mutation { ${createMeLine}(data: {
      name: "Тест lockDate (e2e)", amount: ${money(1)},
      debitAccountId: "${accounts['26']}", creditAccountId: "${accounts['71']}",
      manualEntryId: "${lockMe.id}"
    }) { id } }`,
    {},
    token,
  );
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "manualEntry", recordId: "${lockMe.id}") }`,
    {},
    token,
  );
  console.log(
    `lock-test ME POSTED with postingDate=${yesterdayIso} (period still open) ok`,
  );

  // Закрываем период по вчера включительно.
  await gql(
    '/graphql',
    `mutation { ${updateOrg}(id: "${org.id}", data: { lockDate: "${yesterdayIso}" }) { id } }`,
    {},
    token,
  );
  console.log('lockDate set to', yesterdayIso);

  // 8a. Попытка проведения документа с postingDate позавчера -> RU-отказ.
  const postTestMe = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createMe}(data: { organizationId: "${org.id}", postingDate: "${dayBeforeIso}" }) { id } }`,
      {},
      token,
    )
  )[createMe];
  await gql(
    '/graphql',
    `mutation { ${createMeLine}(data: {
      name: "Тест lockDate — задним числом (e2e)", amount: ${money(1)},
      debitAccountId: "${accounts['26']}", creditAccountId: "${accounts['71']}",
      manualEntryId: "${postTestMe.id}"
    }) { id } }`,
    {},
    token,
  );
  let fail = await gqlRaw(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "manualEntry", recordId: "${postTestMe.id}") }`,
    {},
    token,
  );
  let failMsg = getExtensionMessage(fail);
  if (!failMsg.includes('Период закрыт')) throw new Error(failMsg);
  if (!failMsg.includes(org.name)) throw new Error(failMsg);
  const postTestAfter = (
    await gql<{ manualEntry: { docStatus: string } }>(
      '/graphql',
      `{ manualEntry(filter: { id: { eq: "${postTestMe.id}" } }) { docStatus } }`,
      {},
      token,
    )
  ).manualEntry;
  if (postTestAfter.docStatus !== 'DRAFT')
    throw new Error(
      'blocked post must not have side effects: ' +
        JSON.stringify(postTestAfter),
    );
  console.log(
    'post with postingDate позавчера blocked:',
    failMsg.slice(0, 120),
  );

  // 8b. Попытка отмены документа, проведённого с postingDate <= lockDate -> RU-отказ.
  const fail2 = await gqlRaw(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "manualEntry", recordId: "${lockMe.id}") }`,
    {},
    token,
  );
  const fail2Msg = getExtensionMessage(fail2);
  if (!fail2Msg.includes('Период закрыт')) throw new Error(fail2Msg);
  const lockMeAfter = (
    await gql<{ manualEntry: { docStatus: string } }>(
      '/graphql',
      `{ manualEntry(filter: { id: { eq: "${lockMe.id}" } }) { docStatus } }`,
      {},
      token,
    )
  ).manualEntry;
  if (lockMeAfter.docStatus !== 'POSTED')
    throw new Error(
      'blocked cancel must not have side effects: ' +
        JSON.stringify(lockMeAfter),
    );
  console.log(
    'cancel of document posted before lockDate blocked:',
    fail2Msg.slice(0, 120),
  );

  // Снимаем lockDate — иначе сторно ManualEntry (шаг 6, postingDate=сегодня
  // по умолчанию) упрётся, если сегодняшняя дата когда-либо совпадёт с
  // запертым периодом; снимаем всегда, для чистоты последующих шагов.
  await gql(
    '/graphql',
    `mutation { ${updateOrg}(id: "${org.id}", data: { lockDate: null }) { id } }`,
    {},
    token,
  );
  console.log('lockDate unset (null) ok');

  // 9. Импорт банковской выписки (1CClientBankExchange, CP1251): 1 входящая
  //    на наш ИНН, 1 исходящая, 1 дубль-строка входящей -> 2 DRAFT создано,
  //    1 пропуск (обнаружен в той же транзакции импорта).
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const dateRu = `${pad2(today.getDate())}.${pad2(today.getMonth() + 1)}.${today.getFullYear()}`;

  function paymentBlock(
    number: number,
    amountRub: number,
    payerInn: string,
    payerName: string,
    payeeInn: string,
    payeeName: string,
    purpose: string,
  ): string {
    return [
      'СекцияДокумент=Платежное поручение',
      `Номер=${number}`,
      `Дата=${dateRu}`,
      `Сумма=${amountRub}.00`,
      `ПлательщикИНН=${payerInn}`,
      `Плательщик1=${payerName}`,
      `ПолучательИНН=${payeeInn}`,
      `Получатель1=${payeeName}`,
      `НазначениеПлатежа=${purpose}`,
      'КонецДокумента',
    ].join('\n');
  }

  const incoming = paymentBlock(
    1,
    1000,
    counterpartyInn,
    comp.name,
    orgInn,
    org.name,
    'Оплата по договору (e2e)',
  );
  const outgoing = paymentBlock(
    2,
    500,
    orgInn,
    org.name,
    counterpartyInn,
    comp.name,
    'Оплата поставщику (e2e)',
  );
  const duplicateOfIncoming = incoming; // дубль-строка: те же Номер/Дата/Сумма/контрагент -> должна быть пропущена

  const statementText = [
    '1CClientBankExchange',
    'ВерсияФормата=1.03',
    'Кодировка=Windows-1251',
    incoming,
    outgoing,
    duplicateOfIncoming,
    'КонецФайла',
  ].join('\n');
  const statementBytes = encodeCp1251(statementText);

  async function importStatement(): Promise<{
    errors: unknown[];
    created: { type: string }[];
    skipped: unknown[];
  }> {
    const res = await fetch(
      `${BASE}/rest/erp/bank-statements/import?organizationId=${org.id}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        // Buffer isn't in fetch's BodyInit type under a plain (non-@types/node
        // fetch-lib) tsc invocation; a Uint8Array view is universally typed.
        body: new Uint8Array(statementBytes),
      },
    );

    return res.json();
  }

  const report = await importStatement();
  if (report.errors.length !== 0) throw new Error(JSON.stringify(report));
  if (report.created.length !== 2) throw new Error(JSON.stringify(report));
  if (report.skipped.length !== 1) throw new Error(JSON.stringify(report));
  const createdTypes = report.created.map((c) => c.type).sort();
  if (
    JSON.stringify(createdTypes) !==
    JSON.stringify(['payment', 'supplierPayment'])
  )
    throw new Error(JSON.stringify(report));
  console.log(
    `bank import: created=${report.created.length} skipped=${report.skipped.length} ok (${report.created.map((c) => c.type)})`,
  );

  // Повторный импорт того же файла -> идемпотентность: все 3 строки уже
  // существуют (первые 2 как DRAFT, дубль совпадает с первой) -> 0 создано.
  const report2 = await importStatement();
  if (report2.created.length !== 0) throw new Error(JSON.stringify(report2));
  if (report2.skipped.length !== 3) throw new Error(JSON.stringify(report2));
  console.log(
    `bank re-import (idempotent): created=${report2.created.length} skipped=${report2.skipped.length} ok`,
  );

  // 10. Сторно ManualEntry (шаг 6) -> glEntry реверс, сумма по voucherId = 0,
  // документ возвращается в DRAFT (не терминальный CANCELLED).
  await gql(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "manualEntry", recordId: "${me.id}") }`,
    {},
    token,
  );
  const meAfter = (
    await gql<{
      manualEntry: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
      };
    }>(
      '/graphql',
      `{ manualEntry(filter: { id: { eq: "${me.id}" } }) { docStatus postedAt cancelledAt } }`,
      {},
      token,
    )
  ).manualEntry;
  if (meAfter.docStatus !== 'DRAFT')
    throw new Error(`unexpected: ${JSON.stringify(meAfter)}`);
  if (meAfter.postedAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(meAfter)}`);
  if (meAfter.cancelledAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(meAfter)}`);
  const meRowsAfter = await glEntries(me.id);
  const originals = meRowsAfter.filter((r) => !r.isCancellation);
  const reversals = meRowsAfter.filter((r) => r.isCancellation);
  if (originals.length !== 1 || reversals.length !== 1)
    throw new Error(`unexpected: ${JSON.stringify(meRowsAfter)}`);
  const totalMicros = meRowsAfter.reduce(
    (s, r) => s + Number(r.amount.amountMicros),
    0,
  );
  if (totalMicros !== 0)
    throw new Error(`unexpected: ${JSON.stringify(meRowsAfter)}`);
  console.log(
    'storno ManualEntry ok: docStatus=DRAFT (возвращён в черновик), Σ glEntry.amount по voucherId = 0',
  );

  // 11. Баланс (упрощённая форма, Task 1 Фазы 9) на todayIso: после всех
  //     шагов выше сальдо счетов (коп.) — 41.01=60000, 60.01=−100000,
  //     62.01=0, 90.01.1=−122000, 90.02.1=40000, 90.03=22000, 68.02=−22000,
  //     51=122000, 26=100 (lock-test ME шага 8, никогда не сторнируется —
  //     не путать с шагом 6, полностью реверсированным), 71=−100.
  //     1210 = 41.01(600)+26(1)=601 руб; 1250 = 51 = 1220 руб;
  //     1370 = −(90.01.1(−1220)+90.02.1(400)+90.03(220)) = 600 руб;
  //     1520 = развёрнуто-Кт(60.01=1000, 71=1) + (−68.02(−220))=220 = 1221 руб.
  //     1600 = 1700 = 1821,00 руб = 182100 коп.
  const balanceRpc = await mcpToolCall(token, 'balance_sheet', {
    organizationId: org.id,
    date: todayIso,
  });

  if (!balanceRpc.result || balanceRpc.result.isError)
    throw new Error(`unexpected: ${JSON.stringify(balanceRpc)}`);

  const balanceSheet = mcpToolResultJson(balanceRpc) as {
    totalAssets: { current: number };
    totalLiabilities: { current: number };
    lines: { code: string; current: number }[];
  };

  if (
    balanceSheet.totalAssets.current !== balanceSheet.totalLiabilities.current
  )
    throw new Error(
      `актив != пассив: ${JSON.stringify(balanceSheet.totalAssets)} vs ${JSON.stringify(balanceSheet.totalLiabilities)}`,
    );
  if (balanceSheet.totalAssets.current !== 182100)
    throw new Error(`unexpected: ${JSON.stringify(balanceSheet.totalAssets)}`);

  const balanceByCode = Object.fromEntries(
    balanceSheet.lines.map((line) => [line.code, line.current]),
  );

  if (balanceByCode['1250'] !== 122000)
    throw new Error(JSON.stringify(balanceByCode));
  if (balanceByCode['1210'] !== 60100)
    throw new Error(JSON.stringify(balanceByCode));
  console.log(
    `Баланс (MCP balance_sheet) ok: актив=пассив=${balanceSheet.totalAssets.current / 100} руб, ` +
      `1250(ДС)=${balanceByCode['1250'] / 100}, 1210(Запасы)=${balanceByCode['1210'] / 100}`,
  );

  // 12. ОФР (Task 1 Фазы 9) за todayIso: обороты выручки/себестоимости —
  //     2110 = Кт90.01.1(1220) − Дт90.03(220) = 1000,00; 2120 = Дт90.02.1 = 400,00.
  const ofrRpc = await mcpToolCall(token, 'income_statement', {
    organizationId: org.id,
    dateFrom: todayIso,
    dateTo: todayIso,
  });

  if (!ofrRpc.result || ofrRpc.result.isError)
    throw new Error(`unexpected: ${JSON.stringify(ofrRpc)}`);

  const incomeStatement = mcpToolResultJson(ofrRpc) as {
    lines: { code: string; current: number }[];
  };
  const ofrByCode = Object.fromEntries(
    incomeStatement.lines.map((line) => [line.code, line.current]),
  );

  if (ofrByCode['2110'] !== 100000) throw new Error(JSON.stringify(ofrByCode));
  if (ofrByCode['2120'] !== 40000) throw new Error(JSON.stringify(ofrByCode));
  if (ofrByCode['2300'] !== 60000 || ofrByCode['2400'] !== 60000)
    throw new Error(JSON.stringify(ofrByCode));
  console.log(
    `ОФР (MCP income_statement) ok: выручка(2110)=${ofrByCode['2110'] / 100} руб, ` +
      `расходы(2120)=${ofrByCode['2120'] / 100} руб, прибыль(2300)=${ofrByCode['2300'] / 100} руб`,
  );

  // 13. REST-путь (печатный HTML) для обоих отчётов — тот же сервис, что и
  //     MCP-тулы выше; smoke-проверка, что страница реально рендерится.
  const balanceHtmlResponse = await fetch(
    `${BASE}/rest/erp/reports/balance-sheet?organizationId=${org.id}&date=${todayIso}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (balanceHtmlResponse.status !== 200)
    throw new Error(
      `balance-sheet REST: expected 200, got ${balanceHtmlResponse.status}`,
    );
  const balanceHtml = await balanceHtmlResponse.text();

  if (!balanceHtml.includes('Бухгалтерский баланс'))
    throw new Error('balance-sheet REST: missing title');
  if (!balanceHtml.includes(org.name))
    throw new Error('balance-sheet REST: missing organization name');
  if (balanceHtml.includes('{{'))
    throw new Error('balance-sheet REST: unresolved placeholder');

  const ofrHtmlResponse = await fetch(
    `${BASE}/rest/erp/reports/income-statement?organizationId=${org.id}&dateFrom=${todayIso}&dateTo=${todayIso}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (ofrHtmlResponse.status !== 200)
    throw new Error(
      `income-statement REST: expected 200, got ${ofrHtmlResponse.status}`,
    );
  const ofrHtml = await ofrHtmlResponse.text();

  if (!ofrHtml.includes('Отчёт о финансовых результатах'))
    throw new Error('income-statement REST: missing title');
  if (ofrHtml.includes('{{'))
    throw new Error('income-statement REST: unresolved placeholder');
  console.log(
    'REST печать balance-sheet/income-statement: 200, заголовки и организация на месте, плейсхолдеров не осталось ok',
  );

  console.log('\n=== E2E ЦИКЛ БУХГАЛТЕРИИ ПРОЙДЕН ===');
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(2);
});
