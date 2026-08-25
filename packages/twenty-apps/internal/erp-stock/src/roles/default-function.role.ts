import { defineApplicationRole } from 'twenty-sdk/define';

// Every app needs exactly one defineApplicationRole() to satisfy the SDK's
// "application must declare a default role" requirement, even though
// erp-stock has no logic functions today (posting/logic lives in the
// twenty-server erp-stock module, Task 2). Kept for parity/future functions.
export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  '7c4a836f-3979-47cf-a563-f00a91752aea';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'ERPilot Склад — служебная роль',
  description: 'Роль, от имени которой работают функции блока «Склад»',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
