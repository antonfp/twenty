import { ForbiddenException, Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// Shared by ErpPostingResolver (GraphQL post/cancelDocument) and the MCP
// post_document/cancel_document tool factories: posting/cancelling a
// document writes the document's own records, so it requires the same
// permission as updating that object's records directly. Kept as one
// object-agnostic service so neither caller re-derives the check.
@Injectable()
export class ErpObjectPermissionGuardService {
  constructor(
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async assertCanUpdateObjectRecords({
    workspaceId,
    roleId,
    objectNameSingular,
  }: {
    workspaceId: string;
    roleId: string;
    objectNameSingular: string;
  }): Promise<void> {
    const { flatObjectMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps'],
        },
      );

    const objectMetadata = Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    ).find(
      (flatObject) =>
        isDefined(flatObject) &&
        flatObject.nameSingular === objectNameSingular,
    );

    if (!isDefined(objectMetadata)) {
      throw new ForbiddenException(
        `Unknown document object "${objectNameSingular}"`,
      );
    }

    const { rolesPermissions } = await this.workspaceCacheService.getOrRecompute(
      workspaceId,
      ['rolesPermissions'],
    );

    if (
      rolesPermissions[roleId]?.[objectMetadata.id]?.canUpdateObjectRecords !==
      true
    ) {
      throw new ForbiddenException(
        `Недостаточно прав: операция с документами «${objectNameSingular}» требует права на изменение записей этого объекта.`,
      );
    }
  }
}
