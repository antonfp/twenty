# ERP posting module — wiring guide

Everything in `src/engine/core-modules/erp/` is self-contained and currently
**inert**: `ErpModule` is not imported anywhere. This file lists the exact
steps to wire it in, in order.

## 1. Register the module

Add to the `imports` array of
`src/engine/core-modules/core-engine.module.ts` (alphabetically among the
existing entries, e.g. after `EmailingModule` around line 112):

```ts
import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
// ...
  imports: [
    // ...
    ErpModule,
```

`ErpModule` needs no own imports: `GlobalWorkspaceOrmManager` is provided by
the `@Global()` `GlobalWorkspaceDatasourceModule`
(`src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module.ts`).

## 2. GraphQL mutations postDocument / cancelDocument

`erp-posting.resolver.ts` already exists here and is self-contained:

```ts
postDocument(objectNameSingular: String!, recordId: UUID!): Boolean
cancelDocument(objectNameSingular: String!, recordId: UUID!): Boolean
```

It is a code-first `@Resolver()` (core schema scope — no `@MetadataResolver`),
so step 1 alone registers it: `GraphQLModule` discovers resolvers of any
imported Nest module. **Until step 1 it is dead code.** After wiring, run
`npx nx run twenty-front:graphql:generate` for the front.

Follow-ups to consider at wiring time:
- Permission check: the resolver currently only requires `WorkspaceAuthGuard`;
  posting itself writes with `shouldBypassPermissionChecks: true`. Add a
  check that the acting user may update the document object (see
  `SettingsPermissionGuard` / `CustomPermissionGuard` in `src/engine/guards/`)
  or resolve the user's role and pass it as `RolePermissionConfig` instead of
  the bypass.
- Exception mapping: `ErpPostingException` extends `CustomException`; add a
  filter mapping it to a user-facing GraphQL error if desired (see
  `AuthGraphqlApiExceptionFilter` for the pattern).

## 3. Registering posting rules from a block (Phase 2)

Chosen mechanism: **explicit registration**, not `DiscoveryService`
scanning. Rationale: ERP blocks are installed dynamically as applications, so
a discovery pass (like `MetadataSideEffectHandlerRegistryService`, which
enumerates providers of a module it knows at compile time via
`DiscoveryService.getProviders({ include: [...] })`) would invert the
dependency: the core registry would need to know every block module up-front.
With explicit registration a block module stays self-contained:

```ts
@Module({ imports: [ErpModule] })
export class SalesBlockModule implements OnModuleInit {
  constructor(
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly salesInvoicePostingRules: SalesInvoicePostingRulesService,
  ) {}

  onModuleInit() {
    this.postingRulesRegistry.registerPostingRules(
      'salesInvoice',
      this.salesInvoicePostingRules,
    );
  }
}
```

Multiple providers per object are allowed (block provider + glue providers);
their entries are concatenated in registration order.

## 4. Metadata contract expected by PostingService

Created when a block installs (Phase 2), as `isSystem` metadata objects:

- Document objects: fields `docStatus` (DRAFT/POSTED/CANCELLED), `postedAt`,
  `cancelledAt`, optionally `postingDate` (falls back to `docDate`, then now).
- Document lines: object named `${documentObjectName}Line` with join column
  `${documentObjectName}Id` — this is the convention `loadDocumentLines`
  uses; documents without such an object get `[]`.
- Registers (`partyLedgerEntry`, `stockLedgerEntry`, `glEntry` — see
  `constants/erp-register-object-names.constant.ts`): the entry input fields
  of `types/posting.types.ts` plus `isCancellation` and `isCancelled`
  booleans (default false). Table names follow normal object table naming
  (`computeObjectTargetTable`), nothing special needed.
- `_erp_sequence` is NOT a metadata object: `DocumentNumberingService`
  creates it lazily (`CREATE TABLE IF NOT EXISTS`) in the workspace schema
  inside the caller's transaction.

## 5. Query-runner guard (block edits of POSTED docs + external register writes)

Not implemented yet. Exact hook point found:

- GraphQL/REST record mutations run through
  `src/engine/api/common/common-query-runners/common-base-query-runner.service.ts`,
  which calls
  `workspaceQueryHookService.executePreQueryHooks(...)` (line ~227) before
  executing. Hooks are classes decorated with
  `@WorkspaceQueryHook('objectNameSingular.operation')`
  (`src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator.ts`),
  discovered by
  `workspace-query-hook.explorer.ts` of the same directory. See
  `src/modules/workspace-member/query-hooks/*.pre-query.hook.ts` for the
  throw-to-block pattern.
- Limitation: hook keys are per object name, so the guard hooks must be
  registered per document/register object when a block installs, or the hook
  service must be extended with a wildcard. Plan:
  - for each register object: `createOne/createMany/updateOne/updateMany/`
    `deleteOne/deleteMany/destroyOne/destroyMany` hooks that throw
    unconditionally (registers are written only by PostingService, which goes
    through twenty-orm-v2 repositories, not through the query runners).
  - for each document object: `updateOne/updateMany/deleteOne/...` hooks that
    load the record and throw when `docStatus !== 'DRAFT'` (allow-list the
    fields that stay editable on POSTED docs if any, e.g. tags).

## 6. MCP tools post_document / cancel_document

Registration point:
`src/engine/api/mcp/services/mcp-protocol.service.ts` — the tool-set object
built around lines 240–280 (entries like `[LIST_SKILLS_TOOL_NAME]: { ...createListSkillsTool(...) }`).
Add a factory file per tool under `src/engine/api/mcp/tools/`
(pattern: `list-skills.tool.ts` — exported `*_TOOL_NAME`, zod input schema,
`create*Tool(service, workspaceId)` returning `{ description, inputSchema,
execute }`), inject `PostingService` into `McpProtocolService` (its module
must import `ErpModule`), and register with
`MCP_EXECUTE_TOOL_ANNOTATIONS` (they mutate — not read-only).

## 7. Numbering

`DocumentNumberingService.nextDocumentNumber({ workspaceId, docType, prefix,
executeRawQuery })` is transaction-scoped by design: pass
`transactionScope.executeRawQuery` from the same transaction that creates the
document so a rollback returns the number. Format: `{prefix}-%06d`.
