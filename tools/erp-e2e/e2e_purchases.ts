// E2E цикла закупок ERPilot: счёт поставщика -> проведение -> регистр -> guard
// строк -> оплата -> сальдо -> сторно -> смешанное сальдо AR/AP.
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_purchases.ts
// (сервер на :3000, workspace ERP Dev, dev-логин).
// Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
// TS-порт e2e_purchases.py (директива Антона 26.08: весь наш код на TS).

import { findName, gql, gqlRaw, login, mutationNames } from './lib/e2e-client';

type Id = { id: string };

function randomSuffix(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

async function main() {
  const token = await login();
  console.log('auth ok');
  const names = await mutationNames(token);

  const createOrg = findName(names, 'createOrganization');
  const createCompany = findName(names, 'createCompany');
  const createSinv = findName(names, 'createSupplierInvoice');
  const createSline = findName(names, 'createSupplierInvoiceLine');
  const updateSinv = findName(names, 'updateSupplierInvoice');
  const updateSline = findName(names, 'updateSupplierInvoiceLine');
  const createSpay = findName(names, 'createSupplierPayment');
  const createSalesinv = findName(names, 'createSalesInvoice');
  const createSalesline = findName(names, 'createSalesInvoiceLine');
  console.log(
    'mutations:',
    createOrg,
    createCompany,
    createSinv,
    createSline,
    updateSinv,
    updateSline,
    createSpay,
    createSalesinv,
    createSalesline,
  );

  // уникальный суффикс на прогон — записи разных запусков не смешиваются
  const suffix = randomSuffix();

  // 1. Организация + компания-поставщик (и одновременно покупатель — для шага 6)
  const org = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createOrg}(data: {
      name: "ООО Закупщик (e2e ${suffix})", inn: "7728168971", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }) { id } }`,
      {},
      token,
    )
  )[createOrg];
  console.log('org:', org.id);

  const comp = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createCompany}(data: {
      name: "ООО Поставщик (e2e ${suffix})", isSupplier: true, isCustomer: true
    }) { id } }`,
      {},
      token,
    )
  )[createCompany];
  console.log('supplier/customer company:', comp.id);

  // 2. Счёт поставщика + 2 строки (10x1000, 1x20000, VAT_20) -> postDocument
  const inv = (
    await gql<Record<string, { id: string; docStatus: string }>>(
      '/graphql',
      `mutation { ${createSinv}(data: {
      name: "Черновик e2e", invoiceDate: "2026-08-25",
      organizationId: "${org.id}", supplierId: "${comp.id}"
    }) { id docStatus } }`,
      {},
      token,
    )
  )[createSinv];
  console.log('supplier invoice draft:', inv.id, inv.docStatus);

  const lineIds: string[] = [];

  for (const [nm, qty, price] of [
    ['Партия товара А (e2e)', 10, 1000],
    ['Партия товара Б (e2e)', 1, 20000],
  ] as const) {
    const ln = (
      await gql<Record<string, Id>>(
        '/graphql',
        `mutation { ${createSline}(data: {
          name: "${nm}", quantity: ${qty},
          price: { amountMicros: "${price * 1_000_000}", currencyCode: "RUB" },
          vatRate: "VAT_20", supplierInvoiceId: "${inv.id}"
        }) { id } }`,
        {},
        token,
      )
    )[createSline];
    lineIds.push(ln.id);
  }
  console.log('lines created:', lineIds);

  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "supplierInvoice", recordId: "${inv.id}") }`,
    {},
    token,
  );
  console.log('supplier invoice POSTED');

  const q = (
    await gql<{
      supplierInvoice: {
        id: string;
        name: string;
        number: string;
        docStatus: string;
        total: { amountMicros: string };
        vatTotal: { amountMicros: string };
        paymentStatus: string;
      };
    }>(
      '/graphql',
      `{ supplierInvoice(filter: { id: { eq: "${inv.id}" } }) {
      id name number docStatus total { amountMicros } vatTotal { amountMicros } paymentStatus } }`,
      {},
      token,
    )
  ).supplierInvoice;
  const total = Number(q.total.amountMicros) / 1e6;
  const vat = Number(q.vatTotal.amountMicros) / 1e6;
  console.log(
    `invoice: ${q.name} | number=${q.number} | total=${total} | vat=${vat} | ${q.paymentStatus}`,
  );
  if (!q.number.startsWith('PI-'))
    throw new Error(`number expected PI-..., got ${q.number}`);
  if (total !== 30000) throw new Error(`total expected 30000, got ${total}`);
  if (vat !== 5000)
    throw new Error(`vat expected 5000 (30000*20/120), got ${vat}`);

  type LedgerNode = {
    amount: { amountMicros: string };
    isCancelled: boolean;
    isCancellation: boolean;
  };
  const led = await gql<{
    partyLedgerEntries: { edges: { node: LedgerNode }[] };
  }>(
    '/graphql',
    `{ partyLedgerEntries(filter: { voucherId: { eq: "${inv.id}" } }) {
      edges { node { amount { amountMicros } isCancelled isCancellation } } } }`,
    {},
    token,
  );
  const rows = led.partyLedgerEntries.edges.map((e) => e.node);
  if (
    rows.length !== 1 ||
    Number(rows[0].amount.amountMicros) !== -30000 * 10 ** 6
  ) {
    throw new Error(`unexpected ledger rows: ${JSON.stringify(rows)}`);
  }
  console.log('ledger -30000 ok');

  // 3. Guard: правка проведённого счёта -> ошибка; правка СТРОКИ проведённого счёта -> ошибка
  const guardDoc = await gqlRaw(
    '/graphql',
    `mutation { ${updateSinv}(id: "${inv.id}", data: { comment: "hack" }) { id } }`,
    {},
    token,
  );
  if (!guardDoc.errors)
    throw new Error('guard DID NOT block edit of POSTED supplier invoice!');
  console.log(
    'guard blocks edit of POSTED supplier invoice ok:',
    JSON.stringify(guardDoc.errors).slice(0, 80),
  );

  const guardLine = await gqlRaw(
    '/graphql',
    `mutation { ${updateSline}(id: "${lineIds[0]}", data: { quantity: 999 }) { id } }`,
    {},
    token,
  );
  if (!guardLine.errors)
    throw new Error(
      'guard DID NOT block edit of a line of a POSTED supplier invoice!',
    );
  console.log(
    'guard blocks edit of line of POSTED supplier invoice ok:',
    JSON.stringify(guardLine.errors).slice(0, 80),
  );

  // 4. Оплата 10000 -> PARTIALLY_PAID; оплата 20000 -> PAID; сальдо (не-сторно) = 0
  const pay1 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSpay}(data: {
      name: "Оплата поставщику 1 (e2e)", paymentDate: "2026-08-25",
      amount: { amountMicros: "${10000 * 1_000_000}", currencyCode: "RUB" },
      organizationId: "${org.id}", supplierId: "${comp.id}", supplierInvoiceId: "${inv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSpay];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "supplierPayment", recordId: "${pay1.id}") }`,
    {},
    token,
  );
  let st = (
    await gql<{ supplierInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ supplierInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).supplierInvoice;
  if (st.paymentStatus !== 'PARTIALLY_PAID')
    throw new Error(`unexpected: ${JSON.stringify(st)}`);
  console.log('partial payment ok:', st.paymentStatus);

  const pay2 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSpay}(data: {
      name: "Оплата поставщику 2 (e2e)", paymentDate: "2026-08-25",
      amount: { amountMicros: "${20000 * 1_000_000}", currencyCode: "RUB" },
      organizationId: "${org.id}", supplierId: "${comp.id}", supplierInvoiceId: "${inv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSpay];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "supplierPayment", recordId: "${pay2.id}") }`,
    {},
    token,
  );
  st = (
    await gql<{ supplierInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ supplierInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).supplierInvoice;
  if (st.paymentStatus !== 'PAID')
    throw new Error(`unexpected: ${JSON.stringify(st)}`);
  console.log('full payment ok: PAID');

  async function liveBalance(companyId: string): Promise<number> {
    const balLed = await gql<{
      partyLedgerEntries: { edges: { node: LedgerNode }[] };
    }>(
      '/graphql',
      `{ partyLedgerEntries(filter: { companyId: { eq: "${companyId}" } }) {
          edges { node { amount { amountMicros } isCancelled isCancellation } } } }`,
      {},
      token,
    );

    return (
      balLed.partyLedgerEntries.edges
        .map((e) => e.node)
        .filter((n) => !n.isCancelled && !n.isCancellation)
        .reduce((s, n) => s + Number(n.amount.amountMicros), 0) / 1e6
    );
  }

  const balance = await liveBalance(comp.id);
  if (balance !== 0) throw new Error(`balance expected 0, got ${balance}`);
  console.log('ledger balance 0 ok');

  // 5. cancelDocument второй оплаты -> счёт PARTIALLY_PAID, сторно-запись, живое сальдо -20000,
  // сама оплата возвращается в DRAFT (не терминальный CANCELLED).
  await gql(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "supplierPayment", recordId: "${pay2.id}") }`,
    {},
    token,
  );
  st = (
    await gql<{ supplierInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ supplierInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).supplierInvoice;
  if (st.paymentStatus !== 'PARTIALLY_PAID')
    throw new Error(
      `expected PARTIALLY_PAID after cancel, got ${JSON.stringify(st)}`,
    );
  console.log('after cancel pay2: invoice rolled back to', st.paymentStatus);
  const pay2After = (
    await gql<{
      supplierPayment: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
      };
    }>(
      '/graphql',
      `{ supplierPayment(filter: { id: { eq: "${pay2.id}" } }) {
      docStatus postedAt cancelledAt } }`,
      {},
      token,
    )
  ).supplierPayment;
  if (pay2After.docStatus !== 'DRAFT')
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  if (pay2After.postedAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  if (pay2After.cancelledAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  console.log('pay2 cancelled -> DRAFT, postedAt/cancelledAt null ok');

  const stornoLed = await gql<{
    partyLedgerEntries: { edges: { node: LedgerNode }[] };
  }>(
    '/graphql',
    `{ partyLedgerEntries(filter: { companyId: { eq: "${comp.id}" } }) {
      edges { node { amount { amountMicros } isCancelled isCancellation } } } }`,
    {},
    token,
  );
  const storno = stornoLed.partyLedgerEntries.edges
    .map((e) => e.node)
    .filter((n) => n.isCancellation);
  if (storno.length !== 1)
    throw new Error(
      `expected exactly 1 storno row, got ${JSON.stringify(storno)}`,
    );
  const live = await liveBalance(comp.id);
  if (live !== -20000)
    throw new Error(`live balance expected -20000, got ${live}`);
  console.log(`storno rows: ${storno.length}, live balance: ${live} ok`);

  // 6. Смешанная проверка: та же компания -- ещё и покупатель. Счёт покупателю на 5000, провести.
  const sinv = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createSalesinv}(data: {
      name: "Черновик e2e (AR)", invoiceDate: "2026-08-25",
      organizationId: "${org.id}", customerId: "${comp.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createSalesinv];
  await gql(
    '/graphql',
    `mutation { ${createSalesline}(data: {
      name: "Услуга (e2e AR)", quantity: 1,
      price: { amountMicros: "${5000 * 1_000_000}", currencyCode: "RUB" },
      vatRate: "VAT_20", salesInvoiceId: "${sinv.id}"
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

  const mixed = await liveBalance(comp.id);
  if (mixed !== -15000)
    throw new Error(
      `mixed AR+AP balance expected -20000+5000=-15000, got ${mixed}`,
    );
  console.log(`mixed AR/AP balance: ${mixed} (-20000+5000=-15000) ok`);

  console.log('\n=== E2E ЦИКЛ ЗАКУПОК ПРОЙДЕН ===');
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(2);
});
