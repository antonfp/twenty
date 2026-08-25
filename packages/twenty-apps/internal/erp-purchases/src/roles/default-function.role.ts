import { defineApplicationRole } from 'twenty-sdk/define';

// Every app needs exactly one defineApplicationRole() to satisfy the SDK's
// "application must declare a default role" requirement, even though
// erp-purchases has no logic functions today (post-install seeding lives in
// erp-base). Kept for parity/future logic functions in this block.
export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  'bce8ab47-c242-4076-bdd1-78ca37f8bb0c';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'ERPilot Закупки — служебная роль',
  description: 'Роль, от имени которой работают функции блока «Закупки»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
