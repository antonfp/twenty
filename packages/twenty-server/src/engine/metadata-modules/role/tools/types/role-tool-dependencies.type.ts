import type { ApplicationService } from 'src/engine/core-modules/application/application.service';
import type { ObjectPermissionService } from 'src/engine/metadata-modules/object-permission/object-permission.service';
import type { RoleService } from 'src/engine/metadata-modules/role/role.service';
import type { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

export type RoleToolDependencies = {
  roleService: RoleService;
  userRoleService: UserRoleService;
  objectPermissionService: ObjectPermissionService;
  applicationService: ApplicationService;
};
