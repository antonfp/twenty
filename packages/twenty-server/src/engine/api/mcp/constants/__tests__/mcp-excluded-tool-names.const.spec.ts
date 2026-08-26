import { MCP_EXCLUDED_TOOL_NAMES } from 'src/engine/api/mcp/constants/mcp-excluded-tool-names.const';

// T1 finding (mcp-surface.md §5): register CRUD write-tools were listed in
// get_tool_catalog even though every write is guaranteed to be denied —
// filtering them out is cheap catalog UX, reusing the same excluded-names
// Set that also gates execute_tool/learn_tools.
describe('MCP_EXCLUDED_TOOL_NAMES', () => {
  it.each([
    ['partyLedgerEntry', 'party_ledger_entry', 'party_ledger_entries'],
    ['stockLedgerEntry', 'stock_ledger_entry', 'stock_ledger_entries'],
    ['itemBalance', 'item_balance', 'item_balances'],
    ['glEntry', 'gl_entry', 'gl_entries'],
  ])(
    'excludes every write-tool name for register %s',
    (_, singular, plural) => {
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`create_one_${singular}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`create_many_${plural}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`update_one_${singular}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`update_many_${plural}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`upsert_many_${plural}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`delete_one_${singular}`)).toBe(true);
      expect(MCP_EXCLUDED_TOOL_NAMES.has(`delete_many_${plural}`)).toBe(true);
    },
  );

  it('does NOT exclude read tools for registers — reading a register is legitimate', () => {
    expect(MCP_EXCLUDED_TOOL_NAMES.has('find_one_gl_entry')).toBe(false);
    expect(MCP_EXCLUDED_TOOL_NAMES.has('find_many_gl_entries')).toBe(false);
    expect(MCP_EXCLUDED_TOOL_NAMES.has('group_by_gl_entries')).toBe(false);
  });

  it('does not exclude CRUD tools for an unrelated, non-register object', () => {
    expect(MCP_EXCLUDED_TOOL_NAMES.has('create_one_sales_invoice')).toBe(false);
  });
});
