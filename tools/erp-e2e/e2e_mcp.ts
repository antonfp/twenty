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
//      CRUD-запись в регистр glEntry через MCP -> отказ
//   -> Phase 8 T2 (фронтир AI-кастомизации, execute_tool -> MetadataToolProvider):
//      create_object_metadata (кастомный объект «Договор») -> успех;
//      create_field_metadata («скидка» NUMBER на app-owned salesInvoice) -> успех;
//      create_field_metadata на регистр glEntry -> RU-отказ;
//      delete_field_metadata на поле salesInvoice -> отказ (MVP: только создание);
//      list_customization_surface -> salesInvoice app-owned/canAddFields,
//      glEntry register/заблокирован;
//      негатив: createOneField на glEntry ЧЕРЕЗ ПРЯМОЙ POST /metadata (не MCP) -> отказ
//      (T2 review Finding 1: фронтир живёт в ObjectMetadataService/FieldMetadataService/
//      ViewService, не только в MCP-диспатче);
//      негатив: create_object_metadata для API-key без DATA_MODEL -> отказ
//   -> T2 review round 3 (app-owned frontier в сервисном слое): негатив прямой
//      POST /metadata deleteOneField на salesInvoice.total (app-owned, не
//      регистр) -> RU-отказ; негатив updateOneField(defaultValue: null) на
//      salesInvoice.docStatus -> RU-отказ (final review Finding 1 Major:
//      explicit null раньше проскакивал как «не изменение»)
//   -> Phase 8 T3 (workflow-тулы, execute_tool -> WorkflowToolProvider, штатный
//      движок Twenty): list_workflow_capabilities (непустой список триггеров/
//      действий) -> create_complete_workflow + activate_workflow_version
//      («при создании компании — создать задачу», DATABASE_EVENT company.created
//      -> CREATE_RECORD task) -> триггер через create_one_company -> ASSERT
//      появления task (асинхронно, через workflow-queue) -> cleanup
//      (deactivate_workflow_version) -> негатив: не-админ (без WORKFLOWS) не
//      видит create_complete_workflow -> негатив: CRUD create_one_workflow
//      отклонён (OBJECTS_BLOCKED_FROM_AUTOMATION, admin-токен тоже)
//
// Запуск: volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx tools/erp-e2e/e2e_mcp.ts
// (сервер на :3000, workspace ERP Dev, dev-логин). MCP endpoint: POST /mcp,
// JSON-RPC 2.0, Bearer-авторизация тем же токеном, что и /graphql (см.
// docs/erp-design/mcp-surface.md).

import {
  BASE,
  gql,
  login,
  mcpRpc,
  mcpToolCall,
  mcpToolResultJson,
  type JsonRpcResponse,
} from './lib/e2e-client';

type Id = { id: string };
type RpcWithStatus = JsonRpcResponse & { status: number };

// PostingService.resolvePostingDate() falls back to `new Date().toISOString()`
// (server "now") whenever a document has neither postingDate nor docDate set
// — salesInvoice's own invoiceDate field isn't consulted, so the GL entries'
// actual date is always today's date, not the invoiceDate this script passes
// at document creation. A date hardcoded to whatever "today" was when this
// file was last edited silently rots into a trial_balance mismatch once the
// calendar moves on — compute it instead so the script keeps working
// regardless of which day it runs.
const TODAY_ISO_DATE = new Date().toISOString().slice(0, 10);

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
    'list_customization_surface',
    'list_workflow_capabilities',
    'get_print_template',
    'update_print_template',
    'render_print_preview',
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
    invoiceDate: TODAY_ISO_DATE,
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
    dateFrom: TODAY_ISO_DATE,
    dateTo: TODAY_ISO_DATE,
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

  // 3e. Негатив (coordinator fix-round, integrity finding): generic CRUD
  // update_one_sales_invoice не должен уметь выставить docStatus напрямую —
  // это поле принадлежит потоку проведения (ErpDocumentGuardService,
  // pre-query hook на updateOne), даже когда документ прямо сейчас DRAFT.
  const denyDocStatusOut = await execTool(token, 'update_one_sales_invoice', {
    id: invoice.id,
    docStatus: 'POSTED',
  });
  if (denyDocStatusOut.success) {
    throw new Error(
      `update_one_sales_invoice must reject a manual docStatus write, got: ${JSON.stringify(denyDocStatusOut)}`,
    );
  }
  if (!denyDocStatusOut.error?.includes('managed by the posting flow')) {
    throw new Error(
      `update_one_sales_invoice docStatus denial has unexpected error: ${JSON.stringify(denyDocStatusOut)}`,
    );
  }
  ok(
    `negative: update_one_sales_invoice(docStatus) denied — "${denyDocStatusOut.error}"`,
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
  // T2 (Phase 8): create_one_gl_entry is now excluded from the catalog/
  // execute_tool allow-list too (mcp-excluded-tool-names.const.ts), so the
  // denial now fires at the isToolAllowed check, before ever reaching the
  // register write-guard — accept either message, both prove the write never
  // lands.
  const glWriteDenialText = (glWriteOut.error ?? '').toLowerCase();
  if (
    !glWriteDenialText.includes('server-written') &&
    !glWriteDenialText.includes('not available')
  ) {
    throw new Error(
      `expected register-guard denial message, got: ${JSON.stringify(glWriteOut)}`,
    );
  }
  ok(
    `negative: CRUD write into glEntry register denied — "${glWriteOut.error}"`,
  );

  // 7. Кастомизация метаданных (Phase 8 T2): create_object_metadata/
  // create_field_metadata already exist and are MCP-exposed via execute_tool
  // (MetadataToolProvider) — the frontier is the guard, not new tool names.
  // These METADATA tools do NOT return {success,...} on their happy path
  // (they return the raw created record, e.g. {id, nameSingular, ...}); only
  // the error path is normalized to {success:false, error} by
  // ToolRegistryService.resolveAndExecute's catch. So success below is
  // asserted by the absence of `.error` plus the expected field, not `.success`.

  // 7a. Создать кастомный объект «Договор».
  const contractOut = (await execTool(token, 'create_object_metadata', {
    nameSingular: `contractE2e${suffix.toLowerCase()}`,
    namePlural: `contractE2e${suffix.toLowerCase()}s`,
    labelSingular: 'Договор',
    labelPlural: 'Договоры',
    icon: 'IconFileText',
  })) as { id?: string; nameSingular?: string; error?: string };
  if (contractOut.error || !contractOut.id)
    throw new Error(
      `create_object_metadata (Договор) must succeed for admin, got: ${JSON.stringify(contractOut)}`,
    );
  ok(
    `create_object_metadata: custom object «Договор» created (${contractOut.id})`,
  );

  // 7b. Добавить кастомное поле «скидка» (NUMBER) на salesInvoice — разрешено
  // по ruling'у: кастомные поля можно добавлять на ЛЮБОЙ не-регистровый объект,
  // включая ERP-документы из app-owned блока erp-sales.
  // get_object_metadata returns a bare array (not {result:[...]}) on
  // success — unlike execute_tool's own error envelope, METADATA read tools
  // return their data as-is (see ObjectMetadataToolsFactory.generateTools).
  const salesInvoiceMetaOut = (await execTool(token, 'get_object_metadata', {
    objectName: 'salesInvoice',
    limit: 1,
  })) as unknown as { id: string }[];
  const salesInvoiceObjectId = salesInvoiceMetaOut[0]?.id;
  if (!salesInvoiceObjectId)
    throw new Error(
      `get_object_metadata(salesInvoice) returned no id: ${JSON.stringify(salesInvoiceMetaOut)}`,
    );

  const discountFieldOut = (await execTool(token, 'create_field_metadata', {
    objectMetadataId: salesInvoiceObjectId,
    type: 'NUMBER',
    name: `discountE2e${suffix.toLowerCase()}`,
    label: 'Скидка',
  })) as { id?: string; name?: string; error?: string };
  if (discountFieldOut.error || !discountFieldOut.id)
    throw new Error(
      `create_field_metadata (скидка on salesInvoice) must succeed, got: ${JSON.stringify(discountFieldOut)}`,
    );
  ok(
    `create_field_metadata: custom field «скидка» (NUMBER) added to salesInvoice (${discountFieldOut.id})`,
  );

  // 7c. Негатив: добавить поле на регистр glEntry -> RU-отказ (register frontier).
  const glMetaOut = (await execTool(token, 'get_object_metadata', {
    objectName: 'glEntry',
    limit: 1,
  })) as unknown as { id: string }[];
  const glObjectId = glMetaOut[0]?.id;
  if (!glObjectId)
    throw new Error(
      `get_object_metadata(glEntry) returned no id: ${JSON.stringify(glMetaOut)}`,
    );

  const glFieldOut = await execTool(token, 'create_field_metadata', {
    objectMetadataId: glObjectId,
    type: 'NUMBER',
    name: `blockedE2e${suffix.toLowerCase()}`,
    label: 'Заблокировано',
  });
  if (glFieldOut.success)
    throw new Error(
      `create_field_metadata on register glEntry must be denied, got: ${JSON.stringify(glFieldOut)}`,
    );
  if (!glFieldOut.error?.includes('Регистр')) {
    throw new Error(
      `expected RU register-frontier denial, got: ${JSON.stringify(glFieldOut)}`,
    );
  }
  ok(
    `negative: create_field_metadata on register glEntry denied — "${glFieldOut.error}"`,
  );

  // 7d. Негатив: удалить поле объекта salesInvoice -> отказ (MVP: только создание).
  const deleteFieldOut = await execTool(token, 'delete_field_metadata', {
    id: discountFieldOut.id,
  });
  if (deleteFieldOut.success)
    throw new Error(
      `delete_field_metadata must be denied (MVP: creation only), got: ${JSON.stringify(deleteFieldOut)}`,
    );
  if (!deleteFieldOut.error?.includes('MVP')) {
    throw new Error(
      `expected MVP creation-only denial, got: ${JSON.stringify(deleteFieldOut)}`,
    );
  }
  ok(
    `negative: delete_field_metadata on salesInvoice field denied — "${deleteFieldOut.error}"`,
  );

  // 7e. list_customization_surface -> salesInvoice допускает добавление
  // полей, glEntry — нет.
  const surfaceRpc = (await mcpToolCall(
    token,
    'list_customization_surface',
    {},
  )) as RpcWithStatus;
  const surface = mcpToolResultJson(surfaceRpc) as {
    objects: {
      nameSingular: string;
      origin: string;
      canAddFields: boolean;
    }[];
  };
  const salesInvoiceSurface = surface.objects.find(
    (o) => o.nameSingular === 'salesInvoice',
  );
  const glEntrySurface = surface.objects.find(
    (o) => o.nameSingular === 'glEntry',
  );
  if (
    !salesInvoiceSurface?.canAddFields ||
    salesInvoiceSurface.origin !== 'app-owned'
  )
    throw new Error(
      `list_customization_surface: salesInvoice must be app-owned + canAddFields, got: ${JSON.stringify(salesInvoiceSurface)}`,
    );
  if (
    glEntrySurface?.canAddFields !== false ||
    glEntrySurface.origin !== 'register'
  )
    throw new Error(
      `list_customization_surface: glEntry must be register + !canAddFields, got: ${JSON.stringify(glEntrySurface)}`,
    );
  ok(
    `list_customization_surface: ${surface.objects.length} objects — salesInvoice app-owned/canAddFields, glEntry register/blocked`,
  );

  // 7f. Негатив (T2 review Finding 1, Critical): регистровый фронтир должен
  // держать ВСЕХ вызывающих, не только MCP execute_tool — прямой
  // createOneField на glEntry через /metadata (тем же токеном, без MCP)
  // тоже обязан быть отклонён. Это и есть репро из ревью, теперь ожидаемо
  // отклоняемое ObjectMetadataService/FieldMetadataService напрямую.
  try {
    await gql(
      '/metadata',
      `mutation($input: CreateOneFieldMetadataInput!) { createOneField(input: $input) { id name type } }`,
      {
        input: {
          field: {
            objectMetadataId: glObjectId,
            name: `directBypassE2e${suffix.toLowerCase()}`,
            label: 'Прямой обход',
            type: 'NUMBER',
          },
        },
      },
      token,
    );
    throw new Error(
      'createOneField on register glEntry via direct /metadata must be denied, but succeeded',
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes('Регистр')) throw e;
    ok(
      `negative: direct POST /metadata createOneField on register glEntry denied — "${message.slice(0, 120)}"`,
    );
  }

  // 7g. Негатив: не-админ актёр (без DATA_MODEL) -> create_object_metadata
  // должен быть отклонён (ADMIN_REQUIRED_MESSAGE). Тот же паттерн throwaway
  // role+api-key, что и в 3a, но здесь важен именно недостающий DATA_MODEL,
  // а не canUpdateAllObjectRecords.
  const noDataModelRole = await gql<{ createOneRole: Id }>(
    '/metadata',
    `mutation($input: CreateRoleInput!) { createOneRole(createRoleInput: $input) { id } }`,
    {
      input: {
        label: `E2E No-DataModel Role (e2e ${suffix})`,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        canSoftDeleteAllObjectRecords: true,
        canDestroyAllObjectRecords: true,
        canBeAssignedToApiKeys: true,
        canBeAssignedToUsers: false,
        canAccessAllTools: true,
        canUpdateAllSettings: false,
      },
    },
    token,
  );
  const noDataModelRoleId = noDataModelRole.createOneRole.id;

  const noDataModelApiKey = await gql<{ createApiKey: Id }>(
    '/metadata',
    `mutation($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
    {
      input: {
        name: `e2e-no-data-model-key-${suffix}`,
        expiresAt: '2027-01-01T00:00:00.000Z',
        roleId: noDataModelRoleId,
      },
    },
    token,
  );
  const noDataModelApiKeyId = noDataModelApiKey.createApiKey.id;

  const noDataModelTokenResp = await gql<{
    generateApiKeyToken: { token: string };
  }>(
    '/metadata',
    `mutation($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
    { apiKeyId: noDataModelApiKeyId, expiresAt: '2027-01-01T00:00:00.000Z' },
    token,
  );
  const noDataModelToken = noDataModelTokenResp.generateApiKeyToken.token;

  try {
    const deniedCreateObject = await execTool(
      noDataModelToken,
      'create_object_metadata',
      {
        nameSingular: `shouldFailE2e${suffix.toLowerCase()}`,
        namePlural: `shouldFailE2e${suffix.toLowerCase()}s`,
        labelSingular: 'Не должно создаться',
        labelPlural: 'Не должны создаться',
      },
    );
    // A role with no explicit DATA_MODEL flag fails at MetadataToolProvider's
    // category-level isAvailable() gate before it ever reaches
    // ErpMetadataToolGuardService — the tool is simply absent from the
    // catalog for this role ("Tool not found"), not surfaced as our guard's
    // ADMIN_REQUIRED_MESSAGE. Either way, the outcome that matters (this role
    // cannot create metadata) is proven here. ADMIN_REQUIRED_MESSAGE's exact
    // RU wording is asserted in the unit suite
    // (erp-metadata-tool-guard.service.spec.ts), where the guard is
    // exercised directly, without the upstream category gate in the way.
    if (deniedCreateObject.success !== false)
      throw new Error(
        `create_object_metadata without DATA_MODEL must be denied, got: ${JSON.stringify(deniedCreateObject)}`,
      );
    ok(
      `negative: create_object_metadata denied for API key without DATA_MODEL — "${deniedCreateObject.error}"`,
    );
  } finally {
    await gql(
      '/metadata',
      `mutation($id: UUID!) { revokeApiKey(input: { id: $id }) { id } }`,
      { id: noDataModelApiKeyId },
      token,
    );
    await gql(
      '/metadata',
      `mutation($id: UUID!) { deleteOneRole(roleId: $id) }`,
      { id: noDataModelRoleId },
      token,
    );
  }

  // 9. Негатив (T2 review round 3 — app-owned frontier at the service layer):
  // прямой POST /metadata deleteOneField на salesInvoice.total (app-owned
  // erp-sales field, не регистр) -> RU-отказ. Проверяет, что защита
  // установленных приложений (ObjectMetadataService/FieldMetadataService)
  // держит и вне MCP, тем же прямым GraphQL-каналом, что и Round 2's
  // register-негатив (шаг 23).
  const salesInvoiceFieldsOut = (await execTool(token, 'get_field_metadata', {
    objectName: 'salesInvoice',
    limit: 200,
  })) as unknown as { id: string; name: string }[];
  const totalFieldId = salesInvoiceFieldsOut.find(
    (f) => f.name === 'total',
  )?.id;
  if (!totalFieldId)
    throw new Error(
      'salesInvoice.total field not found via get_field_metadata',
    );

  try {
    await gql(
      '/metadata',
      `mutation($input: DeleteOneFieldInput!) { deleteOneField(input: $input) { id name } }`,
      { input: { id: totalFieldId } },
      token,
    );
    throw new Error(
      'direct /metadata deleteOneField on salesInvoice.total (app-owned) must be denied, but succeeded',
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes('установленному приложению')) throw e;
    ok(
      `negative: direct POST /metadata deleteOneField on app-owned salesInvoice.total denied — "${message.slice(0, 140)}"`,
    );
  }

  // 9b. Негатив (финальное whole-phase ревью, Finding 1 Major): explicit
  // `null` — не отсутствие ключа — тоже структурное изменение и обязано
  // отклоняться, а не проскакивать как «косметика» (isDefined(null) === false
  // раньше маскировал это). docStatus — тот же пример, что в находке: null
  // ломает инвариант ErpDocumentGuardService «docStatus omitted -> DRAFT».
  const docStatusFieldId = salesInvoiceFieldsOut.find(
    (f) => f.name === 'docStatus',
  )?.id;
  if (!docStatusFieldId)
    throw new Error(
      'salesInvoice.docStatus field not found via get_field_metadata',
    );

  try {
    await gql(
      '/metadata',
      `mutation($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id name defaultValue } }`,
      { input: { id: docStatusFieldId, update: { defaultValue: null } } },
      token,
    );
    throw new Error(
      'direct /metadata updateOneField(defaultValue: null) on app-owned salesInvoice.docStatus must be denied, but succeeded',
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes('установленному приложению')) throw e;
    ok(
      `negative: direct POST /metadata updateOneField(defaultValue: null) on app-owned salesInvoice.docStatus denied — "${message.slice(0, 140)}"`,
    );
  }

  // 10. Phase 8 T3 (workflow-тулы): штатный workflow-движок Twenty
  // (create_complete_workflow/activate_workflow_version/… уже существовал —
  // фронтир T3 был только list_workflow_capabilities + верификация
  // admin-гейта). Всё через execute_tool -> WorkflowToolProvider.

  // 10a. list_workflow_capabilities: непустой список триггеров/действий,
  // машиночитаемый JSON, DATABASE_EVENT в списке триггеров.
  const capabilitiesRpc = (await mcpToolCall(
    token,
    'list_workflow_capabilities',
    {},
  )) as RpcWithStatus;
  const capabilities = mcpToolResultJson(capabilitiesRpc) as {
    triggers: { type: string }[];
    actions: { type: string }[];
  };
  if (capabilities.triggers.length === 0 || capabilities.actions.length === 0)
    throw new Error(
      `list_workflow_capabilities: expected non-empty triggers/actions, got: ${JSON.stringify(capabilities)}`,
    );
  if (!capabilities.triggers.some((t) => t.type === 'DATABASE_EVENT'))
    throw new Error(
      `list_workflow_capabilities: expected DATABASE_EVENT trigger, got: ${JSON.stringify(capabilities.triggers.map((t) => t.type))}`,
    );
  ok(
    `list_workflow_capabilities: ${capabilities.triggers.length} trigger type(s), ${capabilities.actions.length} action type(s)`,
  );

  // 10b. create_complete_workflow: «при создании компании — создать задачу».
  const taskStepId = crypto.randomUUID();
  const workflowName = `E2E company->task (e2e ${suffix})`;
  const createWorkflowOut = (await execTool(token, 'create_complete_workflow', {
    name: workflowName,
    trigger: {
      type: 'DATABASE_EVENT',
      settings: {
        eventName: 'company.created',
        outputSchema: {},
      },
    },
    steps: [
      {
        id: taskStepId,
        name: 'Создать задачу',
        type: 'CREATE_RECORD',
        valid: true,
        settings: {
          input: {
            objectName: 'task',
            objectRecord: {
              // NB: {{trigger.object.fieldName}} (as documented, incorrectly,
              // by the platform's own trigger schema description before this
              // task's fix) resolves to undefined at runtime. The DATABASE_EVENT
              // trigger's actual payload shape is {properties:{after:{...}}}
              // (see workflow-database-event-trigger.listener.ts and
              // generate-fake-object-record-event.ts) — the correct path is
              // {{trigger.properties.after.fieldName}}.
              title: `E2E task for {{trigger.properties.after.name}} (${suffix})`,
              status: 'TODO',
            },
          },
          outputSchema: {},
          errorHandlingOptions: {
            retryOnFailure: { value: false },
            continueOnFailure: { value: false },
          },
        },
      },
    ],
    edges: [{ source: 'trigger', target: taskStepId }],
    activate: false,
  })) as {
    success: boolean;
    message?: string;
    error?: string;
    result?: { workflowId: string; workflowVersionId: string };
  };
  if (!createWorkflowOut.success || !createWorkflowOut.result)
    throw new Error(
      `create_complete_workflow failed: ${JSON.stringify(createWorkflowOut)}`,
    );
  const { workflowId, workflowVersionId } = createWorkflowOut.result;
  ok(
    `create_complete_workflow: workflow ${workflowId} / version ${workflowVersionId} (DATABASE_EVENT company.created -> CREATE_RECORD task)`,
  );

  let workflowDeactivated = false;
  try {
    // 10c. activate_workflow_version (тул отдельный от create's activate:true —
    // проверяем оба пути через MCP) + ассерт статуса ACTIVE.
    await execTool(token, 'activate_workflow_version', { workflowVersionId });

    const currentVersionOut = (await execTool(
      token,
      'get_workflow_current_version',
      { workflowId },
    )) as {
      success: boolean;
      workflowVersion?: { status: string };
      error?: string;
    };
    if (
      !currentVersionOut.success ||
      currentVersionOut.workflowVersion?.status !== 'ACTIVE'
    )
      throw new Error(
        `activate_workflow_version: expected ACTIVE status, got: ${JSON.stringify(currentVersionOut)}`,
      );
    ok(`activate_workflow_version: version ${workflowVersionId} is ACTIVE`);

    // 10d. Триггер: создаём компанию через штатный MCP CRUD (не напрямую
    // GraphQL) — тот же DATABASE_EVENT-путь, что реальный агентский сценарий.
    const triggerCompanyName = `ООО Триггер MCP (e2e ${suffix})`;
    const triggerCompanyOut = await execTool(token, 'create_one_company', {
      name: triggerCompanyName,
      isCustomer: true,
    });
    if (!triggerCompanyOut.success)
      throw new Error(
        `create_one_company (workflow trigger) failed: ${JSON.stringify(triggerCompanyOut)}`,
      );
    ok(
      `create_one_company (workflow trigger source): ${(triggerCompanyOut.result as Id).id}`,
    );

    // 10e. Workflow-запуск асинхронный (message queue,
    // workflow-trigger.job.ts) — poll find_many_tasks с таймаутом вместо
    // ожидания синхронного эффекта.
    const expectedTitle = `E2E task for ${triggerCompanyName} (${suffix})`;
    let foundTask: { id: string; title: string } | undefined;
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && !foundTask) {
      const tasksOut = await execTool(token, 'find_many_tasks', {
        title: { eq: expectedTitle },
        select: ['id', 'title'],
      });
      const records =
        (
          tasksOut.result as
            | { records?: { id: string; title: string }[] }
            | undefined
        )?.records ?? [];
      if (records.length > 0) {
        foundTask = records[0];
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!foundTask)
      throw new Error(
        `workflow did not create expected task "${expectedTitle}" within 20s`,
      );
    ok(
      `ASSERT workflow triggered end-to-end: task "${foundTask.title}" created by company.created (${foundTask.id})`,
    );
  } finally {
    // Cleanup per task brief: deactivate (not delete) regardless of outcome.
    // try/catch here (not a bare await): a throw in `finally` masks whatever
    // the try body threw (no-unsafe-finally) — log loudly instead, same
    // pattern as the T4 print-template cleanup below.
    try {
      const deactivateOut = (await execTool(
        token,
        'deactivate_workflow_version',
        { workflowVersionId },
      )) as { success?: boolean; error?: string };

      workflowDeactivated = deactivateOut.success !== false;
      if (!workflowDeactivated)
        console.error(
          `WARN cleanup: deactivate_workflow_version failed: ${JSON.stringify(deactivateOut)}`,
        );
    } catch (cleanupError) {
      console.error(
        'WARN cleanup: deactivate_workflow_version threw:',
        cleanupError,
      );
    }
  }
  if (!workflowDeactivated)
    throw new Error('cleanup: deactivate_workflow_version failed');
  ok(`cleanup: deactivate_workflow_version(${workflowVersionId}) done`);

  // 10f. Негатив (admin-гейт): роль без settings-прав (canUpdateAllSettings:
  // false, тот же паттерн, что и T2's DATA_MODEL-негатив) не видит
  // create_complete_workflow вовсе — WorkflowToolProvider.isAvailable()
  // гейтит PermissionFlagType.WORKFLOWS на уровне категории, тем же
  // механизмом, что MetadataToolProvider гейтит DATA_MODEL (T2).
  const noWorkflowsRole = await gql<{ createOneRole: Id }>(
    '/metadata',
    `mutation($input: CreateRoleInput!) { createOneRole(createRoleInput: $input) { id } }`,
    {
      input: {
        label: `E2E No-Workflows Role (e2e ${suffix})`,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: true,
        canSoftDeleteAllObjectRecords: true,
        canDestroyAllObjectRecords: true,
        canBeAssignedToApiKeys: true,
        canBeAssignedToUsers: false,
        canAccessAllTools: true,
        canUpdateAllSettings: false,
      },
    },
    token,
  );
  const noWorkflowsRoleId = noWorkflowsRole.createOneRole.id;

  const noWorkflowsApiKey = await gql<{ createApiKey: Id }>(
    '/metadata',
    `mutation($input: CreateApiKeyInput!) { createApiKey(input: $input) { id } }`,
    {
      input: {
        name: `e2e-no-workflows-key-${suffix}`,
        expiresAt: '2027-01-01T00:00:00.000Z',
        roleId: noWorkflowsRoleId,
      },
    },
    token,
  );
  const noWorkflowsApiKeyId = noWorkflowsApiKey.createApiKey.id;

  const noWorkflowsTokenResp = await gql<{
    generateApiKeyToken: { token: string };
  }>(
    '/metadata',
    `mutation($apiKeyId: UUID!, $expiresAt: String!) { generateApiKeyToken(apiKeyId: $apiKeyId, expiresAt: $expiresAt) { token } }`,
    { apiKeyId: noWorkflowsApiKeyId, expiresAt: '2027-01-01T00:00:00.000Z' },
    token,
  );
  const noWorkflowsToken = noWorkflowsTokenResp.generateApiKeyToken.token;

  try {
    const deniedCreateWorkflow = await execTool(
      noWorkflowsToken,
      'create_complete_workflow',
      {
        name: `should-fail-e2e-${suffix}`,
        trigger: {
          type: 'MANUAL',
          settings: { outputSchema: {} },
        },
        steps: [],
      },
    );
    if (deniedCreateWorkflow.success !== false)
      throw new Error(
        `create_complete_workflow without WORKFLOWS must be denied, got: ${JSON.stringify(deniedCreateWorkflow)}`,
      );
    ok(
      `negative: create_complete_workflow denied for API key without WORKFLOWS — "${deniedCreateWorkflow.error}"`,
    );

    // 10g. Bonus (already-covered platform check, not a T3 gap): даже
    // admin-токен не может обойти WORKFLOWS-гейт напрямую через generic CRUD
    // (execute_tool -> create_one_workflow) — workflow/workflowVersion входят
    // в OBJECTS_BLOCKED_FROM_AUTOMATION (twenty-shared/workflow), который
    // create-record.service.ts проверяет безусловно для ЛЮБОГО
    // automation-вызывающего (тот же сервис, что и обычный CRUD-тул, и
    // CREATE_RECORD workflow-действие) — т.е. дыры, аналогичной найденной в
    // T2 для metadata, для workflow-объектов нет.
    const crudBypassOut = await execTool(token, 'create_one_workflow', {
      name: `should-not-be-creatable-via-crud-${suffix}`,
    });
    if (crudBypassOut.success)
      throw new Error(
        `CRUD write into workflow object must be denied (OBJECTS_BLOCKED_FROM_AUTOMATION), got: ${JSON.stringify(crudBypassOut)}`,
      );
    ok(
      `negative: CRUD create_one_workflow denied (OBJECTS_BLOCKED_FROM_AUTOMATION) — "${crudBypassOut.error}"`,
    );
  } finally {
    await gql(
      '/metadata',
      `mutation($id: UUID!) { revokeApiKey(input: { id: $id }) { id } }`,
      { id: noWorkflowsApiKeyId },
      token,
    );
    await gql(
      '/metadata',
      `mutation($id: UUID!) { deleteOneRole(roleId: $id) }`,
      { id: noWorkflowsRoleId },
      token,
    );
  }

  // 11. Phase 8 T4 (переопределяемые печатные формы): get_print_template /
  // update_print_template / render_print_preview + REST print endpoint,
  // through the workspace printTemplate object applied by erp-base. Reuses
  // `invoice` from step 3 — printTemplate has just been applied for the
  // first time in this workspace, so there is no pre-existing SCHET override
  // to disturb.
  const MARKER = 'Спасибо за покупку!';

  // 11a. get_print_template: baseline is the built-in template (no active
  // override exists yet), with the placeholder list this print service fills.
  const baselineTemplateRpc = (await mcpToolCall(token, 'get_print_template', {
    documentType: 'SCHET',
  })) as RpcWithStatus;
  const baselineTemplate = mcpToolResultJson(baselineTemplateRpc) as {
    source: string;
    templateHtml: string;
    fallbackReason: string | null;
    availablePlaceholders: string[];
  };
  if (baselineTemplate.source !== 'built-in')
    throw new Error(
      `get_print_template (baseline): expected source built-in, got: ${JSON.stringify(baselineTemplate)}`,
    );
  if (!baselineTemplate.availablePlaceholders.includes('invoice_number'))
    throw new Error(
      `get_print_template (baseline): expected "invoice_number" placeholder, got: ${JSON.stringify(baselineTemplate.availablePlaceholders)}`,
    );
  ok(
    `get_print_template (baseline): source=built-in, ${baselineTemplate.availablePlaceholders.length} known placeholders`,
  );

  // 11b. update_print_template: replace the SCHET template with a valid
  // custom one (known placeholders + a required line block) carrying the
  // marker string.
  const customSchetHtml = [
    '<!doctype html><html><body>',
    `<div>Счёт № {{invoice_number}} от {{invoice_date}}</div>`,
    `<div class="marker">${MARKER}</div>`,
    '<table><tbody>',
    '<!-- BEGIN line -->',
    '<tr><td>{{row_number}}</td><td>{{item_name}}</td><td>{{amount}}</td></tr>',
    '<!-- END line -->',
    '</tbody></table>',
    '</body></html>',
  ].join('\n');

  const updateOut = mcpToolResultJson(
    (await mcpToolCall(token, 'update_print_template', {
      documentType: 'SCHET',
      html: customSchetHtml,
    })) as RpcWithStatus,
  ) as { success: boolean; id: string; message: string };
  if (!updateOut.success)
    throw new Error(
      `update_print_template failed: ${JSON.stringify(updateOut)}`,
    );
  const printTemplateId = updateOut.id;
  ok(`update_print_template: ${updateOut.message}`);

  try {
    // 11c. render_print_preview: the marker shows up, source is "custom".
    const previewRpc = (await mcpToolCall(token, 'render_print_preview', {
      documentType: 'SCHET',
      recordId: invoice.id,
    })) as RpcWithStatus;
    const preview = mcpToolResultJson(previewRpc) as {
      html: string;
      source: string;
      fallbackReason: string | null;
      unfilledPlaceholders: string[];
    };
    if (preview.source !== 'custom' || !preview.html.includes(MARKER))
      throw new Error(
        `render_print_preview: expected custom template with marker, got source=${preview.source}, html contains marker=${preview.html.includes(MARKER)}`,
      );
    ok(`render_print_preview: custom template rendered, marker present`);

    // 11d. Same document through the REST print endpoint (not just MCP) —
    // the override must be visible on the actual print route too.
    const restPrintRes = await fetch(
      `${BASE}/rest/erp/sales-invoices/${invoice.id}/print`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!restPrintRes.ok)
      throw new Error(
        `REST print endpoint failed: HTTP ${restPrintRes.status}`,
      );
    const restPrintHtml = await restPrintRes.text();
    if (!restPrintHtml.includes(MARKER))
      throw new Error(
        'REST print endpoint: expected marker in rendered HTML, not found',
      );
    ok('REST /rest/erp/sales-invoices/:id/print: marker present');
  } finally {
    // 11e. Revert to the built-in template — deactivate the override record
    // via the standard printTemplate CRUD tool (no dedicated "reset" tool by
    // design: an ordinary object, ordinary object-permission CRUD covers it).
    // A throw here would mask a genuine assertion failure from the try body
    // (no-unsafe-finally) — log loudly instead; the 11f fallback asserts will
    // fail anyway if the deactivate did not take effect.
    try {
      const deactivateOut = await execTool(token, 'update_one_print_template', {
        id: printTemplateId,
        isActive: false,
      });
      if (!deactivateOut.success)
        console.error(
          `WARN cleanup: update_one_print_template (deactivate) failed: ${JSON.stringify(deactivateOut)}`,
        );
    } catch (cleanupError) {
      console.error('WARN cleanup: deactivate threw:', cleanupError);
    }
  }
  ok(
    `cleanup: update_one_print_template(${printTemplateId}, isActive=false) done`,
  );

  // 11f. ASSERT fallback: both render_print_preview and the REST endpoint
  // are back to the built-in template — no marker anywhere.
  const fallbackPreview = mcpToolResultJson(
    (await mcpToolCall(token, 'render_print_preview', {
      documentType: 'SCHET',
      recordId: invoice.id,
    })) as RpcWithStatus,
  ) as { html: string; source: string };
  if (
    fallbackPreview.source !== 'built-in' ||
    fallbackPreview.html.includes(MARKER)
  )
    throw new Error(
      `ASSERT fallback: expected built-in template without marker, got: source=${fallbackPreview.source}, hasMarker=${fallbackPreview.html.includes(MARKER)}`,
    );
  const fallbackRestHtml = await (
    await fetch(`${BASE}/rest/erp/sales-invoices/${invoice.id}/print`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).text();
  if (fallbackRestHtml.includes(MARKER))
    throw new Error(
      'ASSERT fallback (REST): marker still present after deactivation',
    );
  ok(
    'ASSERT fallback: render_print_preview and REST print both back to built-in, no marker',
  );

  // 12. Task 3 (Фаза 9): банковская сверка — import_bank_statement (T4-Фазы-6
  // путь, тот же 1CClientBankExchange формат, но через MCP-тул с уже
  // декодированным text, не REST/CP1251 — см. e2e_accounting.ts для
  // REST/CP1251-варианта) -> reconcile_payments (кандидат найден с
  // объяснением) -> confirm_reconciliation (+ идемпотентность + негатив
  // смены привязки) -> post_document -> счёт частично оплачен.
  const reconCompanyOut = await execTool(token, 'create_one_company', {
    name: `ООО Сверка (e2e ${suffix})`,
    isCustomer: true,
    inn: '7811223344',
  });
  if (!reconCompanyOut.success)
    throw new Error(
      `create_one_company (сверка) failed: ${JSON.stringify(reconCompanyOut)}`,
    );
  const reconCompany = reconCompanyOut.result as Id;
  ok(`create_one_company (сверка): ${reconCompany.id}`);

  const reconInvoiceOut = await execTool(token, 'create_one_sales_invoice', {
    name: 'Счёт для сверки (e2e)',
    invoiceDate: TODAY_ISO_DATE,
    organizationId: org.id,
    customerId: reconCompany.id,
  });
  if (!reconInvoiceOut.success)
    throw new Error(
      `create_one_sales_invoice (сверка) failed: ${JSON.stringify(reconInvoiceOut)}`,
    );
  const reconInvoice = reconInvoiceOut.result as Id;

  const reconLineOut = await execTool(token, 'create_one_sales_invoice_line', {
    name: 'Строка для сверки (e2e)',
    quantity: 3,
    price: { amountMicros: '500000000', currencyCode: 'RUB' }, // 500.00 руб -> total 1500.00 руб
    vatRate: 'VAT_20',
    itemId: item.id,
    salesInvoiceId: reconInvoice.id,
  });
  if (!reconLineOut.success)
    throw new Error(
      `create_one_sales_invoice_line (сверка) failed: ${JSON.stringify(reconLineOut)}`,
    );

  const reconPostRpc = (await mcpToolCall(token, 'post_document', {
    objectNameSingular: 'salesInvoice',
    recordId: reconInvoice.id,
  })) as RpcWithStatus;
  const reconPostRes = mcpToolResultJson(reconPostRpc) as {
    success: boolean;
    message: string;
  };
  if (!reconPostRes.success)
    throw new Error(
      `post_document (сверка invoice) failed: ${JSON.stringify(reconPostRes)}`,
    );

  const reconInvoiceAfterPostOut = await execTool(
    token,
    'find_one_sales_invoice',
    { id: reconInvoice.id, select: ['number', 'total', 'paymentStatus'] },
  );
  const reconInvoiceAfterPost = (
    reconInvoiceAfterPostOut.result as {
      records: { number: string; total: { amountMicros: string } }[];
    }
  ).records[0];
  const reconInvoiceNumber = reconInvoiceAfterPost.number;
  ok(
    `create_one_sales_invoice + line + post_document (сверка): № ${reconInvoiceNumber}, total ${Number(reconInvoiceAfterPost.total.amountMicros) / 1e6} RUB, POSTED`,
  );

  // 12a. import_bank_statement (MCP, decoded text — no CP1251 round-trip
  // needed on this path) — one incoming payment, partial amount (900 of
  // 1500), назначение платежа mentions the invoice number.
  const ORG_INN = '7728168971'; // same INN create_one_organization used in step 3
  const reconToday = new Date();
  const pad2Recon = (n: number) => String(n).padStart(2, '0');
  const reconDateRu = `${pad2Recon(reconToday.getDate())}.${pad2Recon(reconToday.getMonth() + 1)}.${reconToday.getFullYear()}`;
  const reconStatementText = [
    '1CClientBankExchange',
    'ВерсияФормата=1.03',
    'Кодировка=UTF-8',
    'СекцияДокумент=Платежное поручение',
    'Номер=901',
    `Дата=${reconDateRu}`,
    'Сумма=900.00',
    'ПлательщикИНН=7811223344',
    `Плательщик1=ООО Сверка (e2e ${suffix})`,
    `ПолучательИНН=${ORG_INN}`,
    `Получатель1=ООО MCP-Тест (e2e ${suffix})`,
    `НазначениеПлатежа=Частичная оплата по счёту № ${reconInvoiceNumber} от ${reconDateRu}`,
    'КонецДокумента',
    'КонецФайла',
  ].join('\n');

  const importRpc = (await mcpToolCall(token, 'import_bank_statement', {
    organizationId: org.id,
    text: reconStatementText,
  })) as RpcWithStatus;
  const importRes = mcpToolResultJson(importRpc) as {
    created: { type: string; id: string; amountKopecks: number }[];
    skipped: unknown[];
    errors: unknown[];
  };
  if (importRes.errors.length !== 0)
    throw new Error(
      `import_bank_statement (сверка) errors: ${JSON.stringify(importRes)}`,
    );
  if (importRes.created.length !== 1 || importRes.created[0].type !== 'payment')
    throw new Error(
      `import_bank_statement (сверка): expected 1 created payment, got: ${JSON.stringify(importRes)}`,
    );
  const reconPaymentId = importRes.created[0].id;
  ok(
    `import_bank_statement (MCP, сверка): created DRAFT payment ${reconPaymentId}, ${importRes.created[0].amountKopecks / 100} RUB`,
  );

  // 12b. reconcile_payments — candidate found with a non-empty RU explanation.
  const reconcileRpc = (await mcpToolCall(token, 'reconcile_payments', {
    organizationId: org.id,
  })) as RpcWithStatus;
  const reconcileRes = mcpToolResultJson(reconcileRpc) as {
    paymentType: string;
    paymentId: string;
    candidates: {
      invoiceId: string;
      invoiceNumber: string | null;
      score: number;
      explanation: string;
    }[];
  }[];
  const reconProposal = reconcileRes.find(
    (p) => p.paymentId === reconPaymentId,
  );
  if (!reconProposal)
    throw new Error(
      `reconcile_payments: proposal for payment ${reconPaymentId} not found, got: ${JSON.stringify(reconcileRes)}`,
    );
  const reconCandidate = reconProposal.candidates.find(
    (c) => c.invoiceId === reconInvoice.id,
  );
  if (
    !reconCandidate ||
    reconCandidate.score <= 0 ||
    !reconCandidate.explanation
  )
    throw new Error(
      `reconcile_payments: expected a scored candidate for invoice ${reconInvoice.id}, got: ${JSON.stringify(reconProposal)}`,
    );
  ok(
    `reconcile_payments: candidate found — счёт № ${reconCandidate.invoiceNumber}, score=${reconCandidate.score}, "${reconCandidate.explanation}"`,
  );

  // 12c. confirm_reconciliation — success, then idempotent re-confirm, then
  // a negative (relink to a different invoice must be refused).
  const confirmRpc = (await mcpToolCall(token, 'confirm_reconciliation', {
    paymentId: reconPaymentId,
    invoiceId: reconInvoice.id,
  })) as RpcWithStatus;
  const confirmRes = mcpToolResultJson(confirmRpc) as {
    success: boolean;
    alreadyLinked: boolean;
    message: string;
  };
  if (!confirmRes.success || confirmRes.alreadyLinked)
    throw new Error(
      `confirm_reconciliation failed: ${JSON.stringify(confirmRes)}`,
    );
  ok(`confirm_reconciliation: ${confirmRes.message}`);

  const confirmAgainRpc = (await mcpToolCall(token, 'confirm_reconciliation', {
    paymentId: reconPaymentId,
    invoiceId: reconInvoice.id,
  })) as RpcWithStatus;
  const confirmAgainRes = mcpToolResultJson(confirmAgainRpc) as {
    success: boolean;
    alreadyLinked: boolean;
  };
  if (!confirmAgainRes.success || !confirmAgainRes.alreadyLinked)
    throw new Error(
      `confirm_reconciliation (idempotent re-confirm) failed: ${JSON.stringify(confirmAgainRes)}`,
    );
  ok(
    'confirm_reconciliation: повторное подтверждение той же пары — идемпотентно ok',
  );

  const relinkRpc = (await mcpToolCall(token, 'confirm_reconciliation', {
    paymentId: reconPaymentId,
    invoiceId: invoice.id, // a different (unrelated, earlier) invoice
  })) as RpcWithStatus;
  const relinkContent = relinkRpc.result?.content as
    | { text: string }[]
    | undefined;
  if (
    !relinkRpc.result?.isError ||
    !relinkContent?.[0]?.text.includes('уже привязан')
  )
    throw new Error(
      `negative: confirm_reconciliation relink must be refused with "уже привязан", got: ${JSON.stringify(relinkRpc)}`,
    );
  ok(
    `negative: confirm_reconciliation relink denied — "${relinkContent[0].text.slice(0, 60)}..."`,
  );

  // 12d. post_document the payment -> счёт частично оплачен (900 of 1500).
  const reconPaymentPostRpc = (await mcpToolCall(token, 'post_document', {
    objectNameSingular: 'payment',
    recordId: reconPaymentId,
  })) as RpcWithStatus;
  const reconPaymentPostRes = mcpToolResultJson(reconPaymentPostRpc) as {
    success: boolean;
  };
  if (!reconPaymentPostRes.success)
    throw new Error(
      `post_document (сверка payment) failed: ${JSON.stringify(reconPaymentPostRes)}`,
    );

  const reconInvoiceAfterPaymentOut = await execTool(
    token,
    'find_one_sales_invoice',
    {
      id: reconInvoice.id,
      select: ['paymentStatus', 'paidAmount'],
    },
  );
  const reconInvoiceAfterPayment = (
    reconInvoiceAfterPaymentOut.result as {
      records: {
        paymentStatus: string;
        paidAmount: { amountMicros: string };
      }[];
    }
  ).records[0];
  if (
    reconInvoiceAfterPayment.paymentStatus !== 'PARTIALLY_PAID' ||
    Number(reconInvoiceAfterPayment.paidAmount.amountMicros) !== 900_000_000
  )
    throw new Error(
      `ASSERT: expected PARTIALLY_PAID/900 RUB after posting, got: ${JSON.stringify(reconInvoiceAfterPayment)}`,
    );
  ok(
    `post_document + ASSERT: счёт сверки PARTIALLY_PAID, paidAmount=${Number(reconInvoiceAfterPayment.paidAmount.amountMicros) / 1e6} RUB`,
  );

  console.log(`\n=== E2E MCP ПРОЙДЕН (${steps} шагов) ===`);
}

main().catch((e) => {
  console.error('FAIL:', e instanceof Error ? e.message : e);
  process.exit(2);
});
