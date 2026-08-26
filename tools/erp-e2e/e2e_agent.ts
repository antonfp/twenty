// Живой диалоговый прогон ERPilot-ассистента (Фаза 8, Task 5): реальный
// LLM-провайдер (openrouter/stealth/ox-alpha, единственная isAvailable модель
// в каталоге воркспейса) через ФАКТИЧЕСКИЙ путь исполнения чата платформы —
// GraphQL-мутацию `runAgent` (AgentRunService -> AgentAsyncExecutorService),
// ту же, что использует "Test agent" в настройках агента и программный
// runAgent для Slack/workflow-агентов. НЕ через /mcp — это отдельная
// поверхность для внешних MCP-клиентов (см. e2e_mcp.ts).
//
// Сценарий:
//   1. Готовим e2e-данные обычными CRUD/posting-мутациями (НЕ агентом):
//      организация + склад + товар + поступление (проведено, остаток) +
//      ручная операция (проведена, проводки за август 2026 — совпадает с
//      "сегодня" по системным часам стенда).
//   2. Диалог 1 (RU): "Покажи ОСВ за август 2026 по организации <org>" ->
//      ассерт: ответ содержит проведённую сумму ручной операции (агент мог
//      узнать её только вызвав tool trial_balance — этот tool стал доступен
//      агенту в Task 5 через ErpAgentToolProvider, реестр ToolRegistryService;
//      до Task 5 он был виден только внешним MCP-клиентам).
//   3. Диалог 2 (RU): "Сколько «<товар>» на складе?" -> ассерт: ответ
//      содержит остаток (через штатный generic-CRUD tool find_many_item_balances
//      по register itemBalance, доступный по роли ERPilot-ассистент).
//
// runAgent (RunAgentResultDTO) не возвращает трассировку вызовов тулов —
// только финальный текст. Доказательство реального tool-call — то, что в
// ответе присутствует РЕАЛЬНАЯ цифра, заведённая этим прогоном (агент не мог
// её угадать).
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_agent.ts
// (сервер на :3000, workspace ERP Dev, dev-логин).
import { findName, gql, login, money, mutationNames } from './lib/e2e-client';

type Id = { id: string };

// packages/twenty-apps/internal/erp-accounting/src/agents/erpilot-assistant.agent.ts
// Apps are separate SDK projects with no cross-project TS imports (same
// convention as shared/erp-references.ts in every erp-* app) — copied verbatim.
const ERPILOT_ASSISTANT_AGENT_UNIVERSAL_IDENTIFIER =
  '6c0caa4e-ea50-4b62-bb40-661e22dee8af';

function randomSuffix(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

type RunAgentResult = {
  runAgent: {
    result: { response?: string } | null;
    error: string | null;
    success: boolean;
  };
};

async function runAgent(
  token: string,
  prompt: string,
): Promise<{ text: string; success: boolean; error: string | null }> {
  const data = await gql<RunAgentResult>(
    '/metadata',
    `mutation RunAgent($input: RunAgentInput!) {
      runAgent(input: $input) { result error success }
    }`,
    {
      input: {
        agentUniversalIdentifier: ERPILOT_ASSISTANT_AGENT_UNIVERSAL_IDENTIFIER,
        prompt,
      },
    },
    token,
  );

  return {
    text: data.runAgent.result?.response ?? '',
    success: data.runAgent.success,
    error: data.runAgent.error,
  };
}

async function main() {
  const token = await login();
  console.log('auth ok');
  const names = await mutationNames(token);

  const createOrg = findName(names, 'createOrganization');
  const createWarehouse = findName(names, 'createWarehouse');
  const createItem = findName(names, 'createItem');
  const createGr = findName(names, 'createGoodsReceipt');
  const createGrLine = findName(names, 'createGoodsReceiptLine');
  const createMe = findName(names, 'createManualEntry');
  const createMeLine = findName(names, 'createManualEntryLine');

  const suffix = randomSuffix();
  let steps = 0;
  const ok = (label: string) => {
    steps += 1;
    console.log(`[${steps}]`, label, 'ok');
  };

  // 1. Организация.
  const org = (
    await gql<Record<string, Id & { name: string }>>(
      '/graphql',
      `mutation { ${createOrg}(data: {
        name: "ООО Агент-Тест (e2e ${suffix})", inn: "7728168971", kpp: "772801001",
        bankName: "ПАО Сбербанк", bik: "044525225",
        settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
        directorName: "Петров П. П.", accountantName: "Сидорова А. В."
      }) { id name } }`,
      {},
      token,
    )
  )[createOrg];
  ok(`организация ${org.name}`);

  // 2. Склад + товар с отличительным остатком (37 шт).
  const warehouse = (
    await gql<Record<string, Id & { name: string }>>(
      '/graphql',
      `mutation { ${createWarehouse}(data: { name: "Склад агента (e2e ${suffix})" }) { id name } }`,
      {},
      token,
    )
  )[createWarehouse];
  const itemName = `Товар агента (e2e ${suffix})`;
  const item = (
    await gql<Record<string, Id>>(
      '/graphql',
      `mutation { ${createItem}(data: { name: "${itemName}", itemType: "GOODS", unit: "PIECE" }) { id } }`,
      {},
      token,
    )
  )[createItem];
  const STOCK_QTY = 37;
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
      name: "${itemName}", itemId: "${item.id}", quantity: ${STOCK_QTY},
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
  const balanceCheck = (
    await gql<{ itemBalance: { actualQty: number } }>(
      '/graphql',
      `{ itemBalance(filter: { itemId: { eq: "${item.id}" }, warehouseId: { eq: "${warehouse.id}" } }) { actualQty } }`,
      {},
      token,
    )
  ).itemBalance;
  if (balanceCheck.actualQty !== STOCK_QTY)
    throw new Error(
      `setup: unexpected itemBalance ${JSON.stringify(balanceCheck)}`,
    );
  ok(`поступление проведено, остаток ${itemName} = ${STOCK_QTY}`);

  // 3. План счетов (26/71 — уже засеян post-install приложения erp-accounting)
  // и ручная операция с отличительной суммой на август 2026.
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

  const ME_AMOUNT_RUB = 93730.48;
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
      name: "Ручная операция агент-теста (e2e)", amount: ${money(ME_AMOUNT_RUB)},
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
  ok(`ручная операция проведена, сумма ${ME_AMOUNT_RUB} ₽ (Дт26/Кт71)`);

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const periodRu = now.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });

  // 4. Диалог 1: ОСВ. Ассерт по отличительной сумме (целая часть рублей, без
  // разделителей — LLM может отформатировать иначе: "93 730" / "93730,48" /
  // "93 730.48" и т.п., поэтому ищем голую последовательность цифр).
  const trialBalancePrompt = `Покажи оборотно-сальдовую ведомость за ${periodRu} по организации ${org.name}.`;
  console.log('\n--- диалог 1 (ОСВ) ---');
  console.log('> ', trialBalancePrompt);
  const trialBalanceReply = await runAgent(token, trialBalancePrompt);
  console.log(
    trialBalanceReply.success
      ? trialBalanceReply.text
      : `ERROR: ${trialBalanceReply.error}`,
  );

  if (!trialBalanceReply.success)
    throw new Error(`runAgent (ОСВ) failed: ${trialBalanceReply.error}`);
  if (trialBalanceReply.text.trim().length === 0)
    throw new Error(
      'runAgent (ОСВ) returned empty text — see report for reasoning-model note',
    );

  const expectedDigits = '93730';
  if (
    !trialBalanceReply.text.replace(/[\s,. ]/g, '').includes(expectedDigits)
  ) {
    throw new Error(
      `ОСВ reply does not contain the seeded amount (${expectedDigits}): ${trialBalanceReply.text}`,
    );
  }
  ok(
    `диалог 1: ответ содержит сумму ${ME_AMOUNT_RUB} ₽ (trial_balance реально вызван)`,
  );

  // 5. Диалог 2: остаток на складе (generic find_many_item_balances по роли).
  const stockPrompt = `Сколько товара «${itemName}» на складе «${warehouse.name}»?`;
  console.log('\n--- диалог 2 (остаток на складе) ---');
  console.log('> ', stockPrompt);
  const stockReply = await runAgent(token, stockPrompt);
  console.log(
    stockReply.success ? stockReply.text : `ERROR: ${stockReply.error}`,
  );

  if (!stockReply.success)
    throw new Error(`runAgent (склад) failed: ${stockReply.error}`);
  if (!stockReply.text.includes(String(STOCK_QTY))) {
    throw new Error(
      `Stock reply does not contain the seeded quantity (${STOCK_QTY}): ${stockReply.text}`,
    );
  }
  ok(`диалог 2: ответ содержит остаток ${STOCK_QTY} шт`);

  console.log(`\nOK: ${steps} шагов, все ассерты прошли. period=${period}`);
}

main().catch((error) => {
  console.error('FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
