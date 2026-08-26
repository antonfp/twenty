import { camelToSnakeCase } from 'twenty-shared/utils';

import { ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES } from 'src/engine/core-modules/erp/constants/erp-protected-metadata-object-names.constant';
import { OUTPUT_NAVIGATION_TOOL_NAMES } from 'src/engine/core-modules/tool/tools/output-navigation-tool/constants/output-navigation-tool-names.constant';

// T1 finding (mcp-surface.md §5): DatabaseToolProvider's create_one_glEntry/
// create_one_itemBalance/... are listed in get_tool_catalog even though the
// register write-guard (erp-*-guard.pre-query.hooks.ts) unconditionally
// rejects the write — the agent could only discover that by burning a call.
// Excluding the write-tool names here removes them from get_tool_catalog AND
// (same Set) from execute_tool/learn_tools' isToolAllowed check, so a direct
// execute_tool call is refused immediately instead of failing later at the
// query-hook — that guard remains the authoritative defense either way.
// find_one/find_many/group_by are intentionally NOT excluded: reading a
// register is legitimate (trial_balance itself reads glEntry).
const registerWriteToolNames = ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES.flatMap(
  (nameSingular) => {
    // namePlural per the object definitions (twenty-apps/internal/erp-*/.../
    // *.object.ts) — not a generic 's'-suffix guess, so the *_many_* tool
    // names below match DatabaseToolProvider's actual
    // camelToSnakeCase(flatObject.namePlural) exactly.
    const namePlural: Record<string, string> = {
      partyLedgerEntry: 'partyLedgerEntries',
      stockLedgerEntry: 'stockLedgerEntries',
      itemBalance: 'itemBalances',
      glEntry: 'glEntries',
    };
    const snakeSingular = camelToSnakeCase(nameSingular);
    const snakePlural = camelToSnakeCase(namePlural[nameSingular]);

    return [
      `create_one_${snakeSingular}`,
      `create_many_${snakePlural}`,
      `update_one_${snakeSingular}`,
      `update_many_${snakePlural}`,
      `upsert_many_${snakePlural}`,
      `delete_one_${snakeSingular}`,
      `delete_many_${snakePlural}`,
    ];
  },
);

export const MCP_EXCLUDED_TOOL_NAMES = new Set([
  'code_interpreter',
  'http_request',
  ...OUTPUT_NAVIGATION_TOOL_NAMES,
  ...registerWriteToolNames,
]);
