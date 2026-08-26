import { ForbiddenException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES } from 'src/engine/core-modules/erp/constants/erp-protected-metadata-object-names.constant';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

// T2 review Finding 1 (Critical): the AI-customization frontier
// (ErpMetadataToolGuardService) lived only in the MCP execute_tool dispatch
// path — the same createOneField/updateOneObject/deleteOneObject mutations
// stayed reachable, unprotected, directly at POST /metadata (GraphQL) with
// the identical Bearer token, since ObjectMetadataResolver/FieldMetadataResolver
// only ever checked PermissionFlagType.DATA_MODEL. Registers must be sacred
// for EVERY caller, not just MCP — so this check is called directly from the
// three metadata SERVICES (ObjectMetadataService/FieldMetadataService/
// ViewService), the one choke point every caller (Settings UI resolver, REST
// /metadata controller, AI tool factory) routes a single mutation through.
// Deliberately NOT called from bulk provisioning (ApplicationSyncService /
// TwentyStandardApplicationService), which builds flat entities and calls
// WorkspaceMigrationValidateBuildAndRunService directly, bypassing these
// services entirely — that's how the register objects/fields get created in
// the first place when erp-accounting/erp-stock/erp-base install or upgrade,
// and must stay unaffected by this guard.
export const assertMetadataTargetObjectNotProtectedRegisterOrThrow = ({
  flatObjectMetadataMaps,
  objectMetadataId,
}: {
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  objectMetadataId: string | undefined;
}): void => {
  if (!isDefined(objectMetadataId)) {
    return;
  }

  const flatObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityMaps: flatObjectMetadataMaps,
    flatEntityId: objectMetadataId,
  });

  if (
    isDefined(flatObjectMetadata) &&
    ALL_ERP_PROTECTED_METADATA_OBJECT_NAMES.includes(
      flatObjectMetadata.nameSingular,
    )
  ) {
    throw new ForbiddenException(
      `Регистр «${flatObjectMetadata.nameSingular}» формируется автоматически при проведении документов — изменение его схемы (сам объект, поля, вьюхи) запрещено, включая через прямой API.`,
    );
  }
};
