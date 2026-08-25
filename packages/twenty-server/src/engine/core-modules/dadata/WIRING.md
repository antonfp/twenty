# DaData module — wiring

Standalone company-lookup module (`findPartyByInn`) for the DaData Suggestions
API. Written for Phase 2 («автозаполнение по ИНН» in `erp-directories`,
docs/PLAN.md). Status (2026-08-25): step 1 DONE — registered in
`core-engine.module.ts`. Steps 2 (TwentyConfigService migration) and 3 (AI
agent tool) remain for Phase 2.

## 1. Register the module

Add `DadataModule` to the imports of the module that will consume it. For the
generally-available service, register it in
`src/engine/core-modules/core-engine.module.ts` alongside the other core
modules:

```ts
import { DadataModule } from 'src/engine/core-modules/dadata/dadata.module';
// ...
imports: [..., DadataModule]
```

`DadataModule` exports `DadataService`; inject it as usual.

## 2. Move the API key into TwentyConfigService

`DadataService` currently reads `process.env.DADATA_API_KEY` directly (marked
with a `ponytail:` comment) to avoid a concurrent edit of `twenty-config`.
When wiring:

1. In `src/engine/core-modules/twenty-config/config-variables.ts`, add next to
   `PEOPLE_DATA_LABS_API_KEY` (same pattern — `ADVANCED_SETTINGS` group,
   `isSensitive: true`, `@IsOptional()`):

   ```ts
   @ConfigVariablesMetadata({
     group: ConfigVariablesGroup.ADVANCED_SETTINGS,
     isSensitive: true,
     description:
       'DaData API key for Russian company requisites lookup by INN. When unset, lookup is unavailable.',
     type: ConfigVariableType.STRING,
   })
   @IsOptional()
   DADATA_API_KEY?: string;
   ```

2. In `DadataService`, inject `TwentyConfigService` and replace the
   `process.env.DADATA_API_KEY` read with
   `this.twentyConfigService.get('DADATA_API_KEY')`; add `TwentyConfigModule`
   availability via the global config (it is already global in the app context).
3. Update `__tests__/dadata.service.spec.ts` to mock `TwentyConfigService`
   instead of mutating `process.env`.

The key is per-installation (self-hosted env / `.env`), matching the plan's
"ключ в env" decision. Free-tier DaData limits apply (10k requests/day).

## 3. Expose to the AI agent («заведи контрагента по ИНН»)

Phase 2 flow: the MCP agent receives «заведи ООО Ромашка, ИНН 7707083893»,
calls a lookup tool, then creates/updates the Company record with the
requisites.

Options, in order of fit with the existing stack:

- **Logic function or tool in the `erp-directories` block** (plan's stated
  choice): the block's server-side function injects `DadataService`, calls
  `findPartyByInn`, and writes `DadataPartyResult` fields onto the Company
  (ИНН/КПП/ОГРН/наименование/адрес/руководитель). See
  `src/engine/core-modules/logic-function/` and `src/engine/core-modules/tool/`
  for the tool-registration pattern (`tool-provider` wires tools to agents).
- Alternatively a thin GraphQL resolver (pattern:
  `company-enrichment/resolvers/company-enrichment.resolver.ts`) if the
  frontend needs direct lookup for a "заполнить по ИНН" button on the Company
  page.

Error contract for the agent: `DadataException` with `code`
(`INVALID_INN` | `API_KEY_NOT_CONFIGURED` | `RATE_LIMITED` | `FORBIDDEN` |
`REQUEST_FAILED`) and a Lingui `userFriendlyMessage`; `null` return means "INN
valid but not found" — the agent should tell the user the counterparty was not
found rather than fail.

## 4. Phase-2 integration point (erp-directories)

- The `erp-directories` standard app (built per
  `engine/workspace-manager/twenty-standard-application/utils/` builders) adds
  the requisites fields to Company: `inn`, `kpp`, `ogrn`, plus bank requisites.
- `DadataPartyResult` maps onto them 1:1; `type` distinguishes ООО/АО
  (`LEGAL`, has `kpp`) from ИП (`INDIVIDUAL`, `kpp: null`, `ogrn` holds
  ОГРНИП).
- Suggested field mapping: `shortName` → Company name, `fullName` →
  полное наименование, `legalAddress` → юридический адрес, `status` — guard
  against creating liquidated counterparties (warn on anything but `ACTIVE`).
- Verification scenario from the plan: fresh workspace → install block →
  «заведи ООО Ромашка, ИНН 7707083893» via MCP agent → requisites filled from
  DaData.
