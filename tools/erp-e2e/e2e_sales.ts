// E2E цикла продаж ERPilot: счёт -> проведение -> регистр -> оплата -> сальдо -> guard -> сторно.
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_sales.ts
// (сервер на :3000, workspace ERP Dev, dev-логин).
// Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
// TS-порт e2e_sales.py (директива Антона 26.08: весь наш код на TS).

import {
  findName,
  getExtensionMessage,
  gql,
  gqlRaw,
  login,
  mcpToolCall,
  mcpToolResultJson,
  mutationNames,
} from './lib/e2e-client';

type Id = { id: string };

async function main() {
  const token = await login();
  console.log('auth ok');
  const names = await mutationNames(token);

  const createCompany = findName(names, 'createCompany');
  const createInvoice = findName(names, 'createSalesInvoice');
  const createLine = findName(names, 'createSalesInvoiceLine');
  const createPayment = findName(names, 'createPayment');
  const updateInvoice = findName(names, 'updateSalesInvoice');
  const createOrg = findName(names, 'createOrganization');
  const updateLine = findName(names, 'updateSalesInvoiceLine');
  console.log(
    'mutations:',
    createCompany,
    createInvoice,
    createLine,
    createPayment,
    createOrg,
  );

  const org = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createOrg}(data: {
      name: "ООО Ромашка (e2e)", inn: "7728168971", kpp: "772801001",
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
      name: "ООО Василёк (e2e)", inn: "7704407589", kpp: "770401001", isCustomer: true
    }) { id } }`,
      {},
      token,
    )
  )[createCompany];
  console.log('customer:', comp.id);

  const inv = (
    await gql<Record<string, { id: string; docStatus: string }>>(
      '/graphql',
      `mutation { ${createInvoice}(data: {
      name: "Черновик e2e", invoiceDate: "2026-08-25",
      organizationId: "${org.id}", customerId: "${comp.id}"
    }) { id docStatus } }`,
      {},
      token,
    )
  )[createInvoice];
  console.log('invoice draft:', inv.id, inv.docStatus);

  for (const [nm, qty, price] of [
    ['Консультационные услуги (e2e)', 10, 3600],
    ['Настройка ПО (e2e)', 1, 54000],
  ] as const) {
    await gql(
      '/graphql',
      `mutation { ${createLine}(data: {
          name: "${nm}", quantity: ${qty},
          price: { amountMicros: "${price * 1_000_000}", currencyCode: "RUB" },
          vatRate: "VAT_20", salesInvoiceId: "${inv.id}"
        }) { id } }`,
      {},
      token,
    );
  }
  console.log('lines created');

  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesInvoice", recordId: "${inv.id}") }`,
    {},
    token,
  );
  console.log('invoice POSTED');

  const q = (
    await gql<{
      salesInvoice: {
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
      `{ salesInvoice(filter: { id: { eq: "${inv.id}" } }) {
      id name number docStatus total { amountMicros } vatTotal { amountMicros } paymentStatus } }`,
      {},
      token,
    )
  ).salesInvoice;
  const total = Number(q.total.amountMicros) / 1e6;
  const vat = Number(q.vatTotal.amountMicros) / 1e6;
  console.log(
    `invoice: ${q.name} | number=${q.number} | total=${total} | vat=${vat} | ${q.paymentStatus}`,
  );
  if (total !== 90000) throw new Error(`total expected 90000, got ${total}`);
  if (vat !== 15000)
    throw new Error(`vat expected 15000 (90000*20/120), got ${vat}`);

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
    Number(rows[0].amount.amountMicros) !== 90000 * 10 ** 6
  ) {
    throw new Error(`unexpected ledger rows: ${JSON.stringify(rows)}`);
  }
  console.log('ledger +90000 ok');

  const guard = await gqlRaw(
    '/graphql',
    `mutation { ${updateInvoice}(id: "${inv.id}", data: { comment: "hack" }) { id } }`,
    {},
    token,
  );
  if (!guard.errors)
    throw new Error('guard DID NOT block edit of POSTED invoice!');
  console.log(
    'guard blocks edit of POSTED invoice ok:',
    getExtensionMessage(guard).slice(0, 80),
  );

  const printRes = await fetch(
    `${process.env.E2E_BASE ?? 'http://localhost:3000'}/rest/erp/sales-invoices/${inv.id}/print`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (printRes.ok) {
    const html = await printRes.text();
    if (
      !(html.includes('Ромашка') && !html.toLowerCase().includes('прописью')) &&
      !html.toLowerCase().includes('рубл')
    ) {
      throw new Error('print form missing expected content');
    }
    console.log('print form ok', `(${html.length} bytes)`);

    // Task 7 (Фаза 9): СБП-QR (ГОСТ Р 56042-2014 / ST00012) — org (above)
    // has full bank requisites, so the built-in template's <!-- BEGIN sbpQr
    // --> block must render: a PNG data-URI image plus the ST00012 payload
    // as its alt="" text (payload isn't otherwise visible in the HTML).
    if (!html.includes('<img src="data:image/png;base64,'))
      throw new Error('print form: expected sbpQr data-URI <img>, not found');
    if (!html.includes('alt="ST00012|Name='))
      throw new Error(
        'print form: expected ST00012 payload in sbpQr alt="", not found',
      );
    if (!html.includes('Оплата по QR (СБП/интернет-банк)'))
      throw new Error('print form: missing sbpQr caption text');
    console.log('print form: sbpQr block (data-URI + ST00012 payload) ok');
  } else {
    console.log(
      `PRINT ENDPOINT: HTTP ${printRes.status} — проверить путь эндпоинта!`,
      (await printRes.text()).slice(0, 200),
    );
  }

  const pay1 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createPayment}(data: {
      name: "Оплата 1 (e2e)", paymentDate: "2026-08-25",
      amount: { amountMicros: "${40000 * 1_000_000}", currencyCode: "RUB" },
      organizationId: "${org.id}", payerId: "${comp.id}", salesInvoiceId: "${inv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createPayment];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "payment", recordId: "${pay1.id}") }`,
    {},
    token,
  );
  let st = (
    await gql<{
      salesInvoice: {
        paymentStatus: string;
        paidAmount?: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus paidAmount { amountMicros } } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (st.paymentStatus !== 'PARTIALLY_PAID')
    throw new Error(`unexpected status: ${JSON.stringify(st)}`);
  console.log('partial payment ok:', st.paymentStatus);

  const pay2 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createPayment}(data: {
      name: "Оплата 2 (e2e)", paymentDate: "2026-08-25",
      amount: { amountMicros: "${50000 * 1_000_000}", currencyCode: "RUB" },
      organizationId: "${org.id}", payerId: "${comp.id}", salesInvoiceId: "${inv.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createPayment];
  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "payment", recordId: "${pay2.id}") }`,
    {},
    token,
  );
  st = (
    await gql<{ salesInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (st.paymentStatus !== 'PAID')
    throw new Error(`unexpected status: ${JSON.stringify(st)}`);
  console.log('full payment ok: PAID');

  const balLed = await gql<{
    partyLedgerEntries: { edges: { node: LedgerNode }[] };
  }>(
    '/graphql',
    `{ partyLedgerEntries(filter: { companyId: { eq: "${comp.id}" } }) {
      edges { node { amount { amountMicros } isCancelled } } } }`,
    {},
    token,
  );
  const balance =
    balLed.partyLedgerEntries.edges
      .map((e) => e.node)
      .filter((n) => !n.isCancelled)
      .reduce((sum, n) => sum + Number(n.amount.amountMicros), 0) / 1e6;
  if (balance !== 0) throw new Error(`balance expected 0, got ${balance}`);
  console.log('ledger balance 0 ok');

  await gql(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "payment", recordId: "${pay2.id}") }`,
    {},
    token,
  );
  st = (
    await gql<{ salesInvoice: { paymentStatus: string } }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv.id}" } }) { paymentStatus } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (st.paymentStatus !== 'PARTIALLY_PAID')
    throw new Error(
      `expected PARTIALLY_PAID after cancel, got ${JSON.stringify(st)}`,
    );
  console.log('after cancel pay2: invoice rolled back to', st.paymentStatus);
  const pay2After = (
    await gql<{
      payment: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
      };
    }>(
      '/graphql',
      `{ payment(filter: { id: { eq: "${pay2.id}" } }) { docStatus postedAt cancelledAt } }`,
      {},
      token,
    )
  ).payment;
  if (pay2After.docStatus !== 'DRAFT')
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  if (pay2After.postedAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  if (pay2After.cancelledAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(pay2After)}`);
  console.log(
    'pay2 cancelled -> DRAFT (not terminal CANCELLED), postedAt/cancelledAt null ok',
  );

  const stornoLed = await gql<{
    partyLedgerEntries: { edges: { node: LedgerNode }[] };
  }>(
    '/graphql',
    `{ partyLedgerEntries(filter: { companyId: { eq: "${comp.id}" } }) {
      edges { node { amount { amountMicros } isCancelled isCancellation } } } }`,
    {},
    token,
  );
  const liveNodes = stornoLed.partyLedgerEntries.edges.map((e) => e.node);
  const live =
    liveNodes
      .filter((n) => !n.isCancelled && !n.isCancellation)
      .reduce((s, n) => s + Number(n.amount.amountMicros), 0) / 1e6;
  const storno = liveNodes.filter((n) => n.isCancellation);
  console.log(
    `storno rows: ${storno.length}, live balance: ${live} (ожидание 40000-90000=-50000? нет: +90000-40000=50000)`,
  );

  // Task 7: cancel -> edit line amount -> re-post -> registers correct.
  // Fresh invoice (no linked payments) so the cancel-block mirror doesn't
  // get in the way — the scenario is about numbering/registers, not guards.
  const inv2 = (
    await gql<Record<string, { id: string; docStatus: string }>>(
      '/graphql',
      `mutation { ${createInvoice}(data: {
      name: "Черновик e2e (re-post)", invoiceDate: "2026-08-25",
      organizationId: "${org.id}", customerId: "${comp.id}"
    }) { id docStatus } }`,
      {},
      token,
    )
  )[createInvoice];
  const line2 = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createLine}(data: {
      name: "Разовая услуга (e2e re-post)", quantity: 1,
      price: { amountMicros: "${12000 * 1_000_000}", currencyCode: "RUB" },
      vatRate: "VAT_20", salesInvoiceId: "${inv2.id}"
    }) { id } }`,
      {},
      token,
    )
  )[createLine];

  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesInvoice", recordId: "${inv2.id}") }`,
    {},
    token,
  );
  const inv2Posted = (
    await gql<{
      salesInvoice: {
        number: string;
        docStatus: string;
        total: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv2.id}" } }) {
      number docStatus total { amountMicros } } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (inv2Posted.docStatus !== 'POSTED')
    throw new Error(`unexpected: ${JSON.stringify(inv2Posted)}`);
  if (Number(inv2Posted.total.amountMicros) !== 12000 * 10 ** 6)
    throw new Error(`unexpected: ${JSON.stringify(inv2Posted)}`);
  const inv2Number = inv2Posted.number;
  console.log('re-post scenario: invoice #', inv2Number, 'posted, total 12000');

  await gql(
    '/graphql',
    `mutation { cancelDocument(objectNameSingular: "salesInvoice", recordId: "${inv2.id}") }`,
    {},
    token,
  );
  const inv2Cancelled = (
    await gql<{
      salesInvoice: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
        number: string;
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv2.id}" } }) {
      docStatus postedAt cancelledAt number } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (inv2Cancelled.docStatus !== 'DRAFT')
    throw new Error(`unexpected: ${JSON.stringify(inv2Cancelled)}`);
  if (inv2Cancelled.postedAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(inv2Cancelled)}`);
  if (inv2Cancelled.cancelledAt !== null)
    throw new Error(`unexpected: ${JSON.stringify(inv2Cancelled)}`);
  if (inv2Cancelled.number !== inv2Number)
    throw new Error(
      'number must survive cancel: ' + JSON.stringify(inv2Cancelled),
    );
  console.log(
    'cancel -> back to DRAFT ok (postedAt/cancelledAt null, number kept)',
  );

  // Editable again while DRAFT -- change the line amount (qty 1 -> 2).
  await gql(
    '/graphql',
    `mutation { ${updateLine}(id: "${line2.id}", data: { quantity: 2 }) { id } }`,
    {},
    token,
  );
  console.log('line quantity edited 1 -> 2 while DRAFT');

  await gql(
    '/graphql',
    `mutation { postDocument(objectNameSingular: "salesInvoice", recordId: "${inv2.id}") }`,
    {},
    token,
  );
  const inv2Reposted = (
    await gql<{
      salesInvoice: {
        docStatus: string;
        number: string;
        total: { amountMicros: string };
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${inv2.id}" } }) {
      docStatus number total { amountMicros } } }`,
      {},
      token,
    )
  ).salesInvoice;
  if (inv2Reposted.docStatus !== 'POSTED')
    throw new Error(`unexpected: ${JSON.stringify(inv2Reposted)}`);
  // DocumentNumberingService only assigns when `number` is empty -- cancel
  // never clears it, so re-post must reuse the SAME number.
  if (inv2Reposted.number !== inv2Number)
    throw new Error(
      'numbering must re-use the same number on re-post: ' +
        JSON.stringify(inv2Reposted),
    );
  if (Number(inv2Reposted.total.amountMicros) !== 24000 * 10 ** 6)
    throw new Error(`unexpected: ${JSON.stringify(inv2Reposted)}`);
  console.log(
    're-post ok: same number',
    inv2Number,
    ', new total 24000 (2x12000)',
  );

  const led2 = await gql<{
    partyLedgerEntries: { edges: { node: LedgerNode }[] };
  }>(
    '/graphql',
    `{ partyLedgerEntries(filter: { voucherId: { eq: "${inv2.id}" } }) {
      edges { node { amount { amountMicros } isCancelled isCancellation } } } }`,
    {},
    token,
  );
  const rows2 = led2.partyLedgerEntries.edges.map((e) => e.node);
  if (rows2.length !== 3)
    throw new Error(
      `expected 3 register rows (original + storno + new) after cancel+re-post, got ${JSON.stringify(rows2)}`,
    );
  const live2 =
    rows2
      .filter((r) => !r.isCancelled && !r.isCancellation)
      .reduce((s, r) => s + Number(r.amount.amountMicros), 0) / 1e6;
  if (live2 !== 24000)
    throw new Error(
      `live party balance expected 24000 after re-post, got ${live2}: ${JSON.stringify(rows2)}`,
    );
  console.log(
    'registers correct after cancel -> edit -> re-post: 3 rows (orig+storno+new), live balance 24000',
  );

  // Task 6: «Исправление счёта» (amend) — POSTED счёт (inv, № q.number,
  // total 90000, 2 строки) -> create_invoice_revision (MCP) -> строки
  // скопированы с суммами -> печать содержит пометку -> повторное создание
  // на том же источнике -> отказ.
  const revisionRpc = await mcpToolCall(token, 'create_invoice_revision', {
    invoiceId: inv.id,
  });

  if (!revisionRpc.result || revisionRpc.result.isError)
    throw new Error(`unexpected: ${JSON.stringify(revisionRpc)}`);

  const revision = mcpToolResultJson(revisionRpc) as {
    success: boolean;
    id: string;
    number: string | null;
    revisionNumber: number;
    sourceId: string;
    linesCopied: number;
    message: string;
  };

  if (
    revision.revisionNumber !== 1 ||
    revision.sourceId !== inv.id ||
    revision.linesCopied !== 2 ||
    revision.number !== q.number
  )
    throw new Error(`unexpected: ${JSON.stringify(revision)}`);
  console.log(
    `create_invoice_revision ok: revision ${revision.id} (№ ${revision.number}, исправление ${revision.revisionNumber}, строк ${revision.linesCopied})`,
  );

  const revisionInvoice = (
    await gql<{
      salesInvoice: {
        docStatus: string;
        revisionNumber: number;
        amendedFrom: { id: string } | null;
      };
    }>(
      '/graphql',
      `{ salesInvoice(filter: { id: { eq: "${revision.id}" } }) {
      docStatus revisionNumber amendedFrom { id } } }`,
      {},
      token,
    )
  ).salesInvoice;

  if (
    revisionInvoice.docStatus !== 'DRAFT' ||
    revisionInvoice.revisionNumber !== 1 ||
    revisionInvoice.amendedFrom?.id !== inv.id
  )
    throw new Error(`unexpected: ${JSON.stringify(revisionInvoice)}`);
  console.log(
    'revision invoice: DRAFT, revisionNumber=1, amendedFrom=source ok (source untouched, still POSTED)',
  );

  const revisionLines = await gql<{
    salesInvoiceLines: {
      edges: {
        node: {
          name: string;
          quantity: number;
          amount: { amountMicros: string };
        };
      }[];
    };
  }>(
    '/graphql',
    `{ salesInvoiceLines(filter: { salesInvoiceId: { eq: "${revision.id}" } }) {
      edges { node { name quantity amount { amountMicros } } } } }`,
    {},
    token,
  );
  const copiedLines = revisionLines.salesInvoiceLines.edges.map((e) => e.node);
  const copiedTotal =
    copiedLines.reduce((sum, l) => sum + Number(l.amount.amountMicros), 0) /
    1e6;

  if (copiedLines.length !== 2 || copiedTotal !== 90000)
    throw new Error(`revision lines mismatch: ${JSON.stringify(copiedLines)}`);
  console.log(
    'revision lines copied ok: 2 lines, total 90000 (matches source)',
  );

  const revisionPrintRes = await fetch(
    `${process.env.E2E_BASE ?? 'http://localhost:3000'}/rest/erp/sales-invoices/${revision.id}/print`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!revisionPrintRes.ok)
    throw new Error(
      `revision print HTTP ${revisionPrintRes.status}: ${(await revisionPrintRes.text()).slice(0, 200)}`,
    );
  const revisionHtml = await revisionPrintRes.text();
  if (!revisionHtml.includes('Исправление № 1'))
    throw new Error('revision print form missing "Исправление № 1" mark');
  console.log('revision print form contains «Исправление № 1» mark ok');

  const repeatRevisionRpc = await mcpToolCall(
    token,
    'create_invoice_revision',
    { invoiceId: inv.id },
  );
  const repeatRevisionContent = repeatRevisionRpc.result?.content as
    | { text: string }[]
    | undefined;

  if (!repeatRevisionRpc.result?.isError || !repeatRevisionContent?.[0]?.text)
    throw new Error(
      `repeat create_invoice_revision must be denied, got: ${JSON.stringify(repeatRevisionRpc)}`,
    );
  if (
    !repeatRevisionContent[0].text.includes('уже есть черновик исправления № 1')
  )
    throw new Error(
      `unexpected refusal text: ${repeatRevisionContent[0].text}`,
    );
  console.log(
    `negative: повторное create_invoice_revision отклонено — "${repeatRevisionContent[0].text.slice(0, 80)}..."`,
  );

  console.log('\n=== E2E ЦИКЛ ПРОЙДЕН ===');
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(e instanceof Error && e.message.startsWith('ASSERT') ? 1 : 2);
});
