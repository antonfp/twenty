import {
  buildRegisterWriteToolNamesToExclude,
  MCP_EXCLUDED_TOOL_NAMES,
} from 'src/engine/api/mcp/constants/mcp-excluded-tool-names.const';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

const buildFlatObjectMetadataMaps = (
  objects: { nameSingular: string; namePlural: string }[],
) =>
  ({
    byUniversalIdentifier: Object.fromEntries(
      objects.map((object, index) => [`u-${index}`, object]),
    ),
  }) as unknown as FlatEntityMaps<FlatObjectMetadata>;

// T1 finding (mcp-surface.md §5): register CRUD write-tools were listed in
// get_tool_catalog even though every write is guaranteed to be denied —
// filtering them out is cheap catalog UX, reusing the same excluded-names
// mechanism that also gates execute_tool/learn_tools.
//
// T2 review Finding 3 (Minor): namePlural used to be a hardcoded literal
// map here — a second source of truth that could drift from the real
// object definitions. buildRegisterWriteToolNamesToExclude now reads it
// live from flatObjectMetadataMaps, so these tests build maps with
// explicit namePlural values and assert the derived tool names follow
// THAT value, not a hardcoded guess.
describe('buildRegisterWriteToolNamesToExclude', () => {
  it.each([
    [
      'partyLedgerEntry',
      'partyLedgerEntries',
      'party_ledger_entry',
      'party_ledger_entries',
    ],
    [
      'stockLedgerEntry',
      'stockLedgerEntries',
      'stock_ledger_entry',
      'stock_ledger_entries',
    ],
    ['itemBalance', 'itemBalances', 'item_balance', 'item_balances'],
    ['glEntry', 'glEntries', 'gl_entry', 'gl_entries'],
  ])(
    'excludes every write-tool name for register %s',
    (nameSingular, namePlural, snakeSingular, snakePlural) => {
      const excluded = buildRegisterWriteToolNamesToExclude(
        buildFlatObjectMetadataMaps([{ nameSingular, namePlural }]),
      );

      expect(excluded.has(`create_one_${snakeSingular}`)).toBe(true);
      expect(excluded.has(`create_many_${snakePlural}`)).toBe(true);
      expect(excluded.has(`update_one_${snakeSingular}`)).toBe(true);
      expect(excluded.has(`update_many_${snakePlural}`)).toBe(true);
      expect(excluded.has(`upsert_many_${snakePlural}`)).toBe(true);
      expect(excluded.has(`delete_one_${snakeSingular}`)).toBe(true);
      expect(excluded.has(`delete_many_${snakePlural}`)).toBe(true);
    },
  );

  it('follows the workspace map plural, not a guessed "+s" suffix (no drift)', () => {
    // Deliberately irregular plural, unlike a naive 's'-suffix guess — proves
    // this is read from the map, not hardcoded.
    const excluded = buildRegisterWriteToolNamesToExclude(
      buildFlatObjectMetadataMaps([
        { nameSingular: 'glEntry', namePlural: 'glEntriesRenamed' },
      ]),
    );

    expect(excluded.has('create_many_gl_entries_renamed')).toBe(true);
    expect(excluded.has('create_many_gl_entrys')).toBe(false);
  });

  it('does NOT exclude read tools for registers — reading a register is legitimate', () => {
    const excluded = buildRegisterWriteToolNamesToExclude(
      buildFlatObjectMetadataMaps([
        { nameSingular: 'glEntry', namePlural: 'glEntries' },
      ]),
    );

    expect(excluded.has('find_one_gl_entry')).toBe(false);
    expect(excluded.has('find_many_gl_entries')).toBe(false);
    expect(excluded.has('group_by_gl_entries')).toBe(false);
  });

  it('does not exclude CRUD tools for an unrelated, non-register object', () => {
    const excluded = buildRegisterWriteToolNamesToExclude(
      buildFlatObjectMetadataMaps([
        { nameSingular: 'salesInvoice', namePlural: 'salesInvoices' },
      ]),
    );

    expect(excluded.has('create_one_sales_invoice')).toBe(false);
  });

  it('is a no-op for a register object absent from this workspace', () => {
    const excluded = buildRegisterWriteToolNamesToExclude(
      buildFlatObjectMetadataMaps([]),
    );

    expect(excluded.size).toBe(0);
  });
});

describe('MCP_EXCLUDED_TOOL_NAMES', () => {
  it('is the static, workspace-independent part (code_interpreter, http_request, navigation) — no register names', () => {
    expect(MCP_EXCLUDED_TOOL_NAMES.has('code_interpreter')).toBe(true);
    expect(MCP_EXCLUDED_TOOL_NAMES.has('http_request')).toBe(true);
    expect(MCP_EXCLUDED_TOOL_NAMES.has('create_one_gl_entry')).toBe(false);
  });
});
