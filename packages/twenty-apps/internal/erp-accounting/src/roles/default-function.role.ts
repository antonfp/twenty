import { defineApplicationRole } from 'twenty-sdk/define';

// Every app needs exactly one defineApplicationRole() to satisfy the SDK's
// "application must declare a default role" requirement, even though
// erp-accounting has no logic functions besides post-install today (posting
// logic lives in the twenty-server erp-accounting module, Task 2). Kept for
// parity/future functions.
export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  'b3c7408a-a839-47ee-82f4-31ecee302fb7';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'ERPilot Бухгалтерия — служебная роль',
  description: 'Роль, от имени которой работают функции блока «Бухгалтерия»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
