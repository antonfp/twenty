import { z } from 'zod';

import { type RoleToolContext } from 'src/engine/metadata-modules/role/tools/types/role-tool-context.type';
import { type RoleToolDependencies } from 'src/engine/metadata-modules/role/tools/types/role-tool-dependencies.type';
import { toRoleSummary } from 'src/engine/metadata-modules/role/tools/utils/to-role-summary.util';
import { toRoleToolErrorMessage } from 'src/engine/metadata-modules/role/tools/utils/to-role-tool-error-message.util';

const listRolesSchema = z.object({});

export const createListRolesTool = (
  deps: Pick<RoleToolDependencies, 'roleService'>,
  context: RoleToolContext,
) => ({
  name: 'list_roles' as const,
  description: `List all roles of this workspace with their permissions.

Returns for each role: global record permissions (canReadAllObjectRecords, ...), settings access (canUpdateAllSettings), per-object permission overrides, permission flags, and assignability (users, agents, API keys).
Roles with isEditable=false (like Admin) are system-managed and cannot be changed.`,
  inputSchema: listRolesSchema,
  execute: async () => {
    try {
      const roles = await deps.roleService.getWorkspaceRoles(
        context.workspaceId,
      );

      return {
        success: true,
        message: `Found ${roles.length} role${roles.length === 1 ? '' : 's'}`,
        result: { roles: roles.map(toRoleSummary) },
      };
    } catch (error) {
      const message = toRoleToolErrorMessage(error);

      return {
        success: false,
        message: `Failed to list roles: ${message}`,
        error: message,
      };
    }
  },
});
