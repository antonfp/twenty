import { camelToSnakeCase, isDefined } from 'twenty-shared/utils';

import { ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES } from 'src/engine/core-modules/erp/constants/erp-protected-metadata-object-names.constant';
import { OUTPUT_NAVIGATION_TOOL_NAMES } from 'src/engine/core-modules/tool/tools/output-navigation-tool/constants/output-navigation-tool-names.constant';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

// Tool names excluded regardless of workspace state — no per-request data
// needed, safe as a module-level constant.
export const MCP_EXCLUDED_TOOL_NAMES = new Set([
  'code_interpreter',
  'http_request',
  ...OUTPUT_NAVIGATION_TOOL_NAMES,
]);

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
//
// T2 review Finding 3 (Minor): namePlural used to be a hardcoded literal map
// here, a second source of truth that could silently drift from the real
// object definitions. Read live from flatObjectMetadataMaps instead (the
// same maps callers of buildMcpToolSet already resolve per request) — zero
// drift risk, at the cost of one extra (cached) map lookup per MCP request.
export const buildRegisterWriteToolNamesToExclude = (
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>,
): Set<string> => {
  const flatObjects = Object.values(
    flatObjectMetadataMaps.byUniversalIdentifier,
  ).filter(isDefined);

  const names = ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES.flatMap(
    (nameSingular) => {
      const flatObject = flatObjects.find(
        (object) => object.nameSingular === nameSingular,
      );

      // Register object not installed in this workspace (block absent) —
      // nothing to exclude.
      if (!isDefined(flatObject)) {
        return [];
      }

      const snakeSingular = camelToSnakeCase(flatObject.nameSingular);
      const snakePlural = camelToSnakeCase(flatObject.namePlural);

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

  return new Set(names);
};
