// E2E MCP-протокола ERPilot: агентский сценарий целиком через MCP
// (initialize -> tools/list -> tools/call), без единого прямого GraphQL-запроса
// для доменных операций. Покрывает Deliverable B задачи 1 фазы 8 (SDD):
//
//   initialize -> tools/list (ERP-тулы присутствуют с описаниями)
//   -> создать организацию+товар+компанию (CRUD-тулы через execute_tool)
//   -> создать счёт со строкой -> post_document -> trial_balance (проводки)
//   -> cancel_document -> ASSERT docStatus DRAFT (Phase 7 T7: cancel не терминален)
//   -> lookup_party_by_inn без DADATA-ключа -> грейсфул-ошибка (не 500)
//   -> негативы: post_document без прав / чужой (несуществующий) recordId -> отказ;
//      CRUD-запись в регистр glEntry через MCP -> отказ guard'ом
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_mcp.ts
// (сервер на :3000, workspace ERP Dev, dev-логин). MCP endpoint: POST /mcp,
// JSON-RPC 2.0, Bearer-авторизация тем же токеном, что и /graphql (см.
// docs/erp-design/mcp-surface.md).

import {
  gql,
  login,
  mcpRpc,
  mcpToolCall,
  mcpToolResultJson,
  type JsonRpcResponse,
} from './lib/e2e-client';

type Id = { id: string };
type RpcWithStatus = JsonRpcResponse & { status: number };

function randomSuffix(len = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  return Array.from(
    { length: len },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

// execute_tool wraps the underlying ToolOutput as a JSON text content block —
// unwrap that once so scenario code reads {success, result, error} directly.
async function execTool(
  token: string,
  toolName: string,
  args: Record<string, unknown> = {},
) {
  const rpc = await mcpToolCall(token, 'execute_tool', {
    toolName,
    arguments: args,
  });

  if (!rpc.result)
    throw new Error(`execute_tool transport error: ${JSON.stringify(rpc)}`);

  const content = rpc.result.content as { type: string; text: string }[];
  const output = JSON.parse(content[0].text) as {
    success: boolean;
    message: string;
    result?: Record<string, unknown>;
    error?: string;
  };

  return output;
}

async function main() {
  const token = await login();
  console.log('auth ok');
  let steps = 0;
  const ok = (label: string) => {
    steps += 1;
    console.log(`[${steps}]`, label, 'ok');
  };

  // 1. initialize
  const init = (await mcpRpc(token, 'initialize')) as RpcWithStatus;
  if (!init.result)
    throw new Error(`initialize failed: ${JSON.stringify(init)}`);
  const initResult = init.result as {
    protocolVersion: string;
    serverInfo: { name: string };
    instructions: string;
  };
  if (!initResult.protocolVersion)
    throw new Error('initialize: missing protocolVersion');
  if (!initResult.serverInfo?.name)
    throw new Error('initialize: missing serverInfo.name');
  if (!initResult.instructions || initResult.instructions.length === 0)
    throw new Error('initialize: empty instructions');
  ok(
    `initialize (protocol ${initResult.protocolVersion}, server "${initResult.serverInfo.name}")`,
  );

  // 2. tools/list — все ERP-тулы + мета-тулы платформы присутствуют, с описаниями.
  const listRpc = (await mcpRpc(token, 'tools/list')) as RpcWithStatus;
  if (!listRpc.result)
    throw new Error(`tools/list failed: ${JSON.stringify(listRpc)}`);
  const tools = (
    listRpc.result as { tools: { name: string; description?: string }[] }
  ).tools;
  const byName = new Map(tools.map((t) => [t.name, t]));

  const EXPECTED_ERP_TOOLS = [
    'post_document',
    'cancel_document',
    'lookup_party_by_inn',
    'trial_balance',
    'import_bank_statement',
  ];
  const EXPECTED_PLATFORM_TOOLS = [
    'search_help_center',
    'get_tool_catalog',
    'execute_tool',
    'load_skills',
    'list_object_metadata_names',
    'list_skills',
    'learn_tools',
  ];

  for (const name of [...EXPECTED_ERP_TOOLS, ...EXPECTED_PLATFORM_TOOLS]) {
    const tool = byName.get(name);

    if (!tool) throw new Error(`tools/list: missing expected tool "${name}"`);
    if (!tool.description || tool.description.length < 10)
      throw new Error(
        `tools/list: tool "${name}" has no meaningful description`,
      );
  }
  ok(
    `tools/list: ${tools.length} tools total, all ${EXPECTED_ERP_TOOLS.length} ERP tools + ${EXPECTED_PLATFORM_TOOLS.length} platform tools present with descriptions`,
  );

  // 3. Агентский сценарий целиком через tools/call.
  const suffix = randomSuffix();

  const orgOut = await execTool(token, 'create_one_organization', {
    name: `ООО MCP-Тест (e2e ${suffix})`,
    inn: '7728168971',
    kpp: '772801001',
    bankName: 'ПАО Сбербанк',
    bik: '044525225',
    settlementAccount: '40702810438000012345',
    corrAccount: '30101810400000000225',
    directorName: 'Петров П. П.',
    accountantName: 'Сидорова А. В.',
  });
  if (!orgOut.success)
    throw new Error(
      `create_one_organization failed: ${JSON.stringify(orgOut)}`,
    );
  const org = orgOut.result as Id;
  ok(`create_one_organization (execute_tool): ${org.id}`);

  const itemOut = await execTool(token, 'create_one_item', {
    name: `Товар MCP (e2e ${suffix})`,
    itemType: 'GOODS',
    unit: 'PIECE',
  });
  if (!itemOut.success)
    throw new Error(`create_one_item failed: ${JSON.stringify(itemOut)}`);
  const item = itemOut.result as Id;
  ok(`create_one_item (execute_tool): ${item.id}`);

  const companyOut = await execTool(token, 'create_one_company', {
    name: `ООО Клиент MCP (e2e ${suffix})`,
    isCustomer: true,
  });
  if (!companyOut.success)
    throw new Error(`create_one_company failed: ${JSON.stringify(companyOut)}`);
  const company = companyOut.result as Id;
  ok(`create_one_company (execute_tool): ${company.id}`);

  const invoiceOut = await execTool(token, 'create_one_sales_invoice', {
    name: 'Черновик e2e (mcp)',
    invoiceDate: '2026-08-26',
    organizationId: org.id,
    customerId: company.id,
  });
  if (!invoiceOut.success)
    throw new Error(
      `create_one_sales_invoice failed: ${JSON.stringify(invoiceOut)}`,
    );
  const invoice = invoiceOut.result as Id;
  ok(`create_one_sales_invoice (execute_tool): ${invoice.id}`);

  const lineOut = await execTool(token, 'create_one_sales_invoice_line', {
    name: `${item.id.slice(0, 8)} — Товар MCP (e2e)`,
    quantity: 3,
    price: { amountMicros: '150000000', currencyCode: 'RUB' }, // 150.00 руб
    vatRate: 'VAT_20',
    itemId: item.id,
    salesInvoiceId: invoice.id,
  });
  if (!lineOut.success)
    throw new Error(
      `create_one_sales_invoice_line failed: ${JSON.stringify(lineOut)}`,
    );
  ok(
    'create_one_sales_invoice_line (execute_tool): line created, invoice total 450.00 RUB',
  );

  // 3a. Негатив: post_document без прав — restricted-role API key (canUpdateAllObjectRecords: false).
  // Уточнение per Research-факты/ruling: workspaceId никогда не приходит от клиента
  // (workspace резолвится сервером из JWT), поэтому классического "передать чужой
  // workspaceId" пути у MCP-тулов нет — negative-тест на права выполняется через
  // отдельный API-key с ролью без права записи, negative-тест на "чужой" workspace —
  // ниже, через несуществующий recordId под тем же валидным токеном (см. 3c).
  const noUpdateRole = await gql<{ createOneRole: Id }>(
    '/metadata',
    `mutation($input: CreateRoleInput!) { createOneRole(createRoleInput: $input) { id } }`,
    {
      input: {
        label: `E2E No-Update Role (e2e ${suffix})`,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: false,
        canSoftDeleteAllObjectRecords: false,
        canDestroyAllObjectRecords: false,
        canBeAssignedToApiKeys: true,
        canBeAssignedToUsers: false,
        canAccessAllTools: true,
        canUpdateAllSettings: false,
      },
    },
    token,
  );
  const restrictedRoleId = noUpdateRole.createOneRole.id;

  const restrictedApiKey = await gql<{ createApiKey: Id }>(
    '/metadata',
    `mutation($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
    {
      input: {
        name: `e2e-no-update-key-${suffix}`,
        expiresAt: '2027-01-01T00:00:00.000Z',
        roleId: restrictedRoleId,
      },
    },
    token,
  );
  const restrictedApiKeyId = restrictedApiKey.createApiKey.id;

  const apiKeyTokenResp = await gql<{ generateApiKeyToken: { token: string } }>(
    '/metadata',
    `mutation($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
    { apiKeyId: restrictedApiKeyId, expiresAt: '2027-01-01T00:00:00.000Z' },
    token,
  );
  const restrictedToken = apiKeyTokenResp.generateApiKeyToken.token;

  try {
    const deniedPost = (await mcpToolCall(restrictedToken, 'post_document', {
      objectNameSingular: 'salesInvoice',
      recordId: invoice.id,
    })) as RpcWithStatus;
    if (deniedPost.status >= 500)
      throw new Error(
        `post_document without permission must not 500, got HTTP ${deniedPost.status}`,
      );
    const deniedContent = deniedPost.result?.content as
      | { text: string }[]
      | undefined;
    if (!deniedPost.result?.isError || !deniedContent?.[0]?.text) {
      throw new Error(
        `post_document without permission must be denied, got: ${JSON.stringify(deniedPost)}`,
      );
    }
    ok(
      `negative: post_document denied for API key without canUpdateObjectRecords — "${deniedContent[0].text.slice(0, 70)}..."`,
    );
  } finally {
    // cleanup: revoke + delete the throwaway role/key regardless of assertion outcome
    await gql(
      '/metadata',
      `mutation($id: UUID!) { revokeApiKey(input: { id: $id }) { id } }`,
      { id: restrictedApiKeyId },
      token,
    );
    await gql(
      '/metadata',
      `mutation($id: UUID!) { deleteOneRole(roleId: $id) }`,
      { id: restrictedRoleId },
      token,
    );
  }

  // 3b. post_document (успех, тот же admin-токен) -> POSTED.
  const postResRpc = (await mcpToolCall(token, 'post_document', {
    objectNameSingular: 'salesInvoice',
    recordId: invoice.id,
  })) as RpcWithStatus;
  const postRes = mcpToolResultJson(postResRpc) as {
    success: boolean;
    message: string;
  };
  if (!postRes.success)
    throw new Error(`post_document failed: ${JSON.stringify(postRes)}`);
  ok(`post_document: ${postRes.message}`);

  const postedInvoiceOut = await execTool(token, 'find_one_sales_invoice', {
    id: invoice.id,
    select: ['docStatus', 'total'],
  });
  const postedInvoice = (
    postedInvoiceOut.result as {
      records: { docStatus: string; total: { amountMicros: string } }[];
    }
  ).records[0];
  if (postedInvoice.docStatus !== 'POSTED')
    throw new Error(`expected POSTED, got ${JSON.stringify(postedInvoice)}`);
  ok(
    `find_one_sales_invoice (execute_tool): docStatus=POSTED, total=${Number(postedInvoice.total.amountMicros) / 1e6} RUB`,
  );

  // 3c. trial_balance — assert проводки.
  const trialBalanceRpc = (await mcpToolCall(token, 'trial_balance', {
    organizationId: org.id,
    dateFrom: '2026-08-26',
    dateTo: '2026-08-26',
  })) as RpcWithStatus;
  const trialBalance = mcpToolResultJson(trialBalanceRpc) as {
    rows: { accountCode: string }[];
    totals: { turnoverDebit: number; turnoverCredit: number };
  };
  if (trialBalance.rows.length === 0)
    throw new Error(
      'trial_balance: no rows — invoice posting produced no проводки',
    );
  if (
    trialBalance.totals.turnoverDebit !== trialBalance.totals.turnoverCredit
  ) {
    throw new Error(
      `trial_balance: turnover Дт/Кт mismatch: ${JSON.stringify(trialBalance.totals)}`,
    );
  }
  if (trialBalance.totals.turnoverDebit === 0)
    throw new Error('trial_balance: zero turnover after posting');
  ok(
    `trial_balance (MCP): ${trialBalance.rows.length} account rows, turnover Дт=Кт=${trialBalance.totals.turnoverDebit / 100} руб`,
  );

  const glRowsOut = await execTool(token, 'find_many_gl_entries', {
    voucherId: { eq: invoice.id },
    select: ['id'],
  });
  const glRows = (glRowsOut.result as { records: { id: string }[] }).records;
  if (glRows.length === 0)
    throw new Error(
      'find_many_gl_entries: expected glEntry rows for the posted invoice, got 0',
    );
  ok(
    `find_many_gl_entries (execute_tool): ${glRows.length} проводки for the posted invoice`,
  );

  // 3d. cancel_document -> Phase 7 T7 semantics: back to DRAFT, not terminal CANCELLED.
  const cancelResRpc = (await mcpToolCall(token, 'cancel_document', {
    objectNameSingular: 'salesInvoice',
    recordId: invoice.id,
  })) as RpcWithStatus;
  const cancelRes = mcpToolResultJson(cancelResRpc) as {
    success: boolean;
    message: string;
  };
  if (!cancelRes.success)
    throw new Error(`cancel_document failed: ${JSON.stringify(cancelRes)}`);
  ok(`cancel_document: ${cancelRes.message}`);

  const cancelledInvoiceOut = await execTool(token, 'find_one_sales_invoice', {
    id: invoice.id,
    select: ['docStatus', 'postedAt', 'cancelledAt'],
  });
  const cancelledInvoice = (
    cancelledInvoiceOut.result as {
      records: {
        docStatus: string;
        postedAt: string | null;
        cancelledAt: string | null;
      }[];
    }
  ).records[0];
  if (cancelledInvoice.docStatus !== 'DRAFT') {
    throw new Error(
      `ASSERT docStatus DRAFT after cancel (Phase 7 T7 semantics), got: ${JSON.stringify(cancelledInvoice)}`,
    );
  }
  if (
    cancelledInvoice.postedAt !== null ||
    cancelledInvoice.cancelledAt !== null
  ) {
    throw new Error(
      `cancel must clear postedAt/cancelledAt, got: ${JSON.stringify(cancelledInvoice)}`,
    );
  }
  ok(
    'ASSERT docStatus DRAFT after cancel_document (not terminal CANCELLED — Phase 7 T7), postedAt/cancelledAt null',
  );

  // 4. lookup_party_by_inn без DADATA_API_KEY -> грейсфул-ошибка, не 500.
  const lookupRpc = (await mcpToolCall(token, 'lookup_party_by_inn', {
    inn: '7728168971',
  })) as RpcWithStatus;
  if (lookupRpc.status >= 500)
    throw new Error(
      `lookup_party_by_inn without DADATA key must not 500, got HTTP ${lookupRpc.status}`,
    );
  if (!lookupRpc.result?.isError) {
    // If a DADATA_API_KEY happens to be configured in this environment, the call
    // succeeds instead — still a valid (non-500) outcome, just log it.
    console.log(
      '  (note: lookup_party_by_inn succeeded — DADATA_API_KEY is configured in this environment)',
    );
  }
  const lookupContent = lookupRpc.result?.content as
    | { text: string }[]
    | undefined;
  ok(
    `lookup_party_by_inn without DADATA key: graceful ${lookupRpc.result?.isError ? 'error' : 'success'} (HTTP ${lookupRpc.status}) — "${lookupContent?.[0]?.text?.slice(0, 60)}"`,
  );

  // 5. Негатив: "чужой" recordId — валидный формат UUID, не существующий в этом
  // workspace. MCP-тулы никогда не принимают workspaceId от клиента (он резолвится
  // сервером из JWT), поэтому единственный практический способ смоделировать
  // "чужой workspace" на живом MCP-протоколе — обратиться к id, которого нет в
  // текущей workspace-схеме; сервер обязан ответить "not found", а не утечкой
  // данных другого workspace или 500-й.
  const foreignRecordRpc = (await mcpToolCall(token, 'post_document', {
    objectNameSingular: 'salesInvoice',
    recordId: '00000000-0000-4000-8000-000000000000',
  })) as RpcWithStatus;
  if (foreignRecordRpc.status >= 500)
    throw new Error(
      `post_document on foreign/nonexistent record must not 500, got HTTP ${foreignRecordRpc.status}`,
    );
  const foreignContent = foreignRecordRpc.result?.content as
    | { text: string }[]
    | undefined;
  if (!foreignRecordRpc.result?.isError)
    throw new Error(
      `post_document on nonexistent recordId must be denied, got: ${JSON.stringify(foreignRecordRpc)}`,
    );
  ok(
    `negative: post_document denied for nonexistent/foreign recordId — "${foreignContent?.[0]?.text}"`,
  );

  // 6. Негатив: CRUD-запись в регистр glEntry через MCP (execute_tool) -> отказ guard'ом.
  const glWriteOut = await execTool(token, 'create_one_gl_entry', {
    amount: { amountMicros: '1000000', currencyCode: 'RUB' },
  });
  if (glWriteOut.success)
    throw new Error(
      `CRUD write into glEntry register must be denied, got: ${JSON.stringify(glWriteOut)}`,
    );
  if (!glWriteOut.error?.toLowerCase().includes('server-written')) {
    throw new Error(
      `expected register-guard denial message, got: ${JSON.stringify(glWriteOut)}`,
    );
  }
  ok(
    `negative: CRUD write into glEntry register denied by guard — "${glWriteOut.error}"`,
  );

  console.log(`\n=== E2E MCP ПРОЙДЕН (${steps} шагов) ===`);
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(2);
});
