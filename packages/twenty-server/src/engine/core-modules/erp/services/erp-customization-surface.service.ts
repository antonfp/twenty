import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES } from 'src/engine/core-modules/erp/constants/erp-protected-metadata-object-names.constant';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';

export type CustomizationSurfaceOrigin = 'custom' | 'register' | 'app-owned';

export type CustomizationSurfaceObjectEntry = {
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  origin: CustomizationSurfaceOrigin;
  ownerApplicationName?: string;
  canAddFields: boolean;
  fieldCount: number;
  isSystem: boolean;
};

// Read-side counterpart to ErpMetadataToolGuardService: gives the agent
// context on what it CAN customize before it tries (list_customization_surface
// MCP tool), using the same isCustom-is-gone / applicationId ===
// workspaceCustomFlatApplication.id signal the guard's write path relies on
// for creation (see erp-metadata-tool-guard.service.ts). Unlike the guard,
// this resolves app-ownership per object — it's the one place in T2 where
// that resolution is actually consumed, since the write path collapses
// update/delete to an unconditional refusal for MVP.
@Injectable()
export class ErpCustomizationSurfaceService {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async listCustomizationSurface(
    workspaceId: string,
  ): Promise<CustomizationSurfaceObjectEntry[]> {
    const [
      { workspaceCustomFlatApplication },
      { flatObjectMetadataMaps, flatFieldMetadataMaps, flatApplicationMaps },
    ] = await Promise.all([
      this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      ),
      this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps({
        workspaceId,
        flatMapsKeys: [
          'flatObjectMetadataMaps',
          'flatFieldMetadataMaps',
          'flatApplicationMaps',
        ],
      }),
    ]);

    const fieldCountByObjectId = new Map<string, number>();

    for (const fieldMetadata of Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    )) {
      if (!isDefined(fieldMetadata)) {
        continue;
      }

      fieldCountByObjectId.set(
        fieldMetadata.objectMetadataId,
        (fieldCountByObjectId.get(fieldMetadata.objectMetadataId) ?? 0) + 1,
      );
    }

    const entries: CustomizationSurfaceObjectEntry[] = [];

    for (const objectMetadata of Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    )) {
      if (!isDefined(objectMetadata)) {
        continue;
      }

      const isRegister = ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES.includes(
        objectMetadata.nameSingular,
      );
      const isCustom =
        objectMetadata.applicationId === workspaceCustomFlatApplication.id;
      const origin: CustomizationSurfaceOrigin = isRegister
        ? 'register'
        : isCustom
          ? 'custom'
          : 'app-owned';

      entries.push({
        nameSingular: objectMetadata.nameSingular,
        namePlural: objectMetadata.namePlural,
        labelSingular: objectMetadata.labelSingular,
        origin,
        ownerApplicationName:
          origin === 'app-owned'
            ? (flatApplicationMaps.byId[objectMetadata.applicationId]?.name ??
              undefined)
            : undefined,
        // Ruling: custom fields can be added to ANY non-register object,
        // custom or app-owned alike (e.g. "add a discount field to
        // salesInvoice" is legal even though salesInvoice ships with erp-sales).
        canAddFields: !isRegister,
        fieldCount: fieldCountByObjectId.get(objectMetadata.id) ?? 0,
        isSystem: objectMetadata.isSystem,
      });
    }

    return entries.sort((a, b) => a.nameSingular.localeCompare(b.nameSingular));
  }
}
