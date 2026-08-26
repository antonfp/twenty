// Shared HTTP/GraphQL/MCP client helpers for the erp-e2e regression scripts.
// TS port of the boilerplate duplicated across the original e2e_*.py scripts
// (Node 24 global fetch, volta run --node 24.5.0 --yarn 4.13.0 -- npx tsx).

export const BASE = 'http://localhost:3000';
export const EMAIL = 'tim@apple.dev';
export const PASSWORD = 'DevLocal2026!erp';

type JsonRecord = Record<string, unknown>;

const authHeaders = (token?: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Like the Python gql(): throws on GraphQL errors, returns `data` on success.
export async function gql<T = JsonRecord>(
  path: string,
  query: string,
  variables: JsonRecord = {},
  token?: string,
): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ query, variables }),
  });
  const out = await res.json();

  if (out.errors) {
    throw new Error(JSON.stringify(out.errors).slice(0, 600));
  }

  return out.data as T;
}

// Like the Python gql_raw(): never throws, returns the raw {data, errors} body
// so negative-path assertions can inspect `errors` themselves.
export async function gqlRaw(
  path: string,
  query: string,
  variables: JsonRecord = {},
  token?: string,
): Promise<JsonRecord> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ query, variables }),
  });

  return res.json();
}

export async function login(
  email: string = EMAIL,
  password: string = PASSWORD,
): Promise<string> {
  const loginTokenData = await gql<{
    getLoginTokenFromCredentials: { loginToken: { token: string } };
  }>(
    '/metadata',
    `mutation L($e: String!, $p: String!) {
      getLoginTokenFromCredentials(email: $e, password: $p, origin: "http://localhost:3001") {
        loginToken { token } } }`,
    { e: email, p: password },
  );
  const loginToken =
    loginTokenData.getLoginTokenFromCredentials.loginToken.token;

  const authTokensData = await gql<{
    getAuthTokensFromLoginToken: {
      tokens: { accessOrWorkspaceAgnosticToken: { token: string } };
    };
  }>(
    '/metadata',
    `mutation T($t: String!) {
      getAuthTokensFromLoginToken(loginToken: $t, origin: "http://localhost:3001") {
        tokens { accessOrWorkspaceAgnosticToken { token } } } }`,
    { t: loginToken },
  );

  return authTokensData.getAuthTokensFromLoginToken.tokens
    .accessOrWorkspaceAgnosticToken.token;
}

export async function mutationNames(token: string): Promise<string[]> {
  const data = await gql<{ __type: { fields: { name: string }[] } }>(
    '/graphql',
    '{ __type(name: "Mutation") { fields { name } } }',
    {},
    token,
  );

  return data.__type.fields.map((f) => f.name);
}

export function findName(names: string[], exact: string): string {
  const found = names.find((n) => n.toLowerCase() === exact.toLowerCase());

  if (!found) {
    const hint = names.filter((n) =>
      n.toLowerCase().includes(exact.slice(6, 12).toLowerCase()),
    );

    throw new Error(`no mutation named ${exact}; have: ${JSON.stringify(hint)}`);
  }

  return found;
}

export function money(rub: number): string {
  return `{ amountMicros: "${Math.round(rub * 1_000_000)}", currencyCode: "RUB" }`;
}

// userFriendlyMessage (RU, with names) lives in extensions, not message — the
// raw English message with UUIDs is put there separately by the GraphQL error
// handler (see generate-graphql-error-from-error.util.ts).
export function getExtensionMessage(errResponse: JsonRecord): string {
  const errors = (errResponse.errors as JsonRecord[] | undefined) ?? [];

  if (errors.length === 0) {
    throw new Error(`expected GraphQL errors, got ${JSON.stringify(errResponse)}`);
  }

  const ext = (errors[0].extensions as JsonRecord | undefined) ?? {};

  return (ext.userFriendlyMessage as string | undefined) ?? (errors[0].message as string) ?? '';
}

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: JsonRecord;
  error?: { code: number; message: string };
};

let rpcIdCounter = 0;

// Raw JSON-RPC POST to the MCP endpoint. Accept header omits text/event-stream
// so the controller replies with a plain JSON body (see mcp-core.controller.ts).
export async function mcpRpc(
  token: string | undefined,
  method: string,
  params?: JsonRecord,
): Promise<JsonRpcResponse> {
  rpcIdCounter += 1;

  const res = await fetch(BASE + '/mcp', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      Accept: 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: rpcIdCounter,
      method,
      ...(params ? { params } : {}),
    }),
  });

  return { status: res.status, ...(await res.json()) } as JsonRpcResponse & {
    status: number;
  };
}

export async function mcpToolCall(
  token: string,
  name: string,
  args: JsonRecord = {},
): Promise<JsonRpcResponse & { status: number }> {
  return mcpRpc(token, 'tools/call', { name, arguments: args }) as Promise<
    JsonRpcResponse & { status: number }
  >;
}

// Unwraps a successful tools/call result's single text content block as JSON
// (all ERP MCP tools return one JSON-encoded text block — same shape the
// Python e2e_accounting.py script parsed for trial_balance).
export function mcpToolResultJson(rpc: JsonRpcResponse): JsonRecord {
  if (!rpc.result || rpc.result.isError) {
    throw new Error(`MCP tool call failed: ${JSON.stringify(rpc)}`);
  }

  const content = rpc.result.content as { type: string; text: string }[];

  return JSON.parse(content[0].text);
}
