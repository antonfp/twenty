import { ForbiddenException, Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

// Shared by REST/GraphQL callers that need the caller's roleId before an
// ErpObjectPermissionGuardService check: a user is identified by
// userWorkspaceId, an API key by its FlatApiKey. Neither ApiKeyRoleService
// nor UserRoleService knows about the other's auth branch, so this is the
// one place that picks between them.
@Injectable()
export class ErpActorRoleResolverService {
  constructor(
    private readonly userRoleService: UserRoleService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
  ) {}

  async resolveRoleId({
    workspaceId,
    userWorkspaceId,
    apiKey,
  }: {
    workspaceId: string;
    userWorkspaceId: string | undefined;
    apiKey: FlatApiKey | undefined;
  }): Promise<string> {
    if (isDefined(userWorkspaceId)) {
      return this.userRoleService.getRoleIdForUserWorkspace({
        workspaceId,
        userWorkspaceId,
      });
    }

    if (isDefined(apiKey)) {
      return this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
    }

    throw new ForbiddenException(
      'Операция требует аутентифицированного пользователя или API-ключа.',
    );
  }
}
