import { defineApplicationRole } from 'twenty-sdk/define';

// Every app needs exactly one defineApplicationRole() to satisfy the SDK's
// "application must declare a default role" requirement, even though
// erp-sales has no logic functions today (post-install seeding lives in
// erp-base). Kept for parity/future logic functions in this block.
export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  '3c39cb7d-6a32-416d-bc40-7d5162bb2ab2';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'ERPilot Продажи — служебная роль',
  description: 'Роль, от имени которой работают функции блока «Продажи»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
