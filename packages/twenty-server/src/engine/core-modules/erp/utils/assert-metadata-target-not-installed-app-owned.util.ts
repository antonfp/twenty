import { ForbiddenException } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

// "objectNameSingular.fieldName" for error messages — falls back to the bare
// field name if the parent object can't be resolved (shouldn't happen, but
// an error message is not the place to throw a second exception over it).
export const describeFieldTarget = (
  flatFieldMetadata: FlatFieldMetadata | undefined,
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>,
): string => {
  if (!isDefined(flatFieldMetadata)) {
    return 'unknown';
  }

  const flatObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
    flatEntityMaps: flatObjectMetadataMaps,
    flatEntityId: flatFieldMetadata.objectMetadataId,
  });

  return isDefined(flatObjectMetadata)
    ? `${flatObjectMetadata.nameSingular}.${flatFieldMetadata.name}`
    : flatFieldMetadata.name;
};

// Matches FieldMetadataOverrides' shape (label/description/icon/translations)
// — Twenty's own existing "cosmetic override on an entity you don't own"
// concept, just applied at the update-guard boundary instead of the
// overrides column.
export const FIELD_COSMETIC_UPDATE_KEYS: ReadonlySet<string> = new Set([
  'label',
  'description',
  'icon',
  'translations',
]);

export const OBJECT_COSMETIC_UPDATE_KEYS: ReadonlySet<string> = new Set([
  'labelSingular',
  'labelPlural',
  'description',
  'icon',
  'translations',
]);

// T2 review round 3 (controller ruling on the round-2 finding): a
// DATA_MODEL-carrying admin token could updateOneField/deleteOneField on
// ANY field of an INSTALLED application via direct /metadata (e.g.
// salesInvoice.total, .docStatus) — belongsToTwentyStandardApp only
// recognises Twenty's own base CRM app, and these ERP fields are not
// isSystem, so nothing protected them. Odoo/1C precedent: a module's fields
// are untouchable except by uninstalling the module. Called from the same
// service choke points as the register guard
// (ObjectMetadataService.updateOneObject/deleteManyObjectMetadatas,
// FieldMetadataService.updateOneField/deleteOneField) — so it holds for
// every caller (Settings UI, REST, AI tools).
//
// exemptApplicationIds is BOTH the workspace custom app AND
// twentyStandardFlatApplication, not just custom: Twenty's own base CRM
// fields (Company/Person/Opportunity/...) are `applicationId !== custom app`
// too, and the platform's own integration suite
// (successful-update-one-standard-field-metadata.integration-spec.ts,
// successful-update-one-standard-object-metadata.integration-spec.ts)
// exercises admins freely toggling isActive/options/defaultValue/color on
// them today — that's deliberate, tested, existing CRM admin behavior this
// guard must not regress. What this guard actually closes is the erp-* gap
// (p.2): fields belonging to any OTHER installed application. Twenty-standard
// already has its own narrower validation for what's off-limits on its own
// fields (e.g. renaming the internal `name`, see
// failing-update-one-standard-field-metadata.integration-spec.ts) —
// unaffected, this guard doesn't run for that application at all.
//
// Deliberately NOT applied when the caller passed an explicit
// ownerFlatApplication: every resolver/REST-controller/AI-tool-factory call
// site leaves it undefined (verified by grep — it defaults to the workspace
// custom app), so an explicit value marks a trusted internal caller (e.g.
// the drop-favorite-objects upgrade command deletes a Twenty-standard
// object with ownerFlatApplication: twentyStandardFlatApplication,
// isSystemBuild: true) that must stay unaffected — this is a platform
// self-maintenance operation, not an actor-driven mutation.
export const isInstalledAppOwnedMetadataTarget = ({
  targetApplicationId,
  exemptApplicationIds,
  ownerFlatApplicationOverride,
}: {
  targetApplicationId: string | undefined;
  exemptApplicationIds: ReadonlySet<string>;
  ownerFlatApplicationOverride: unknown;
}): boolean =>
  !isDefined(ownerFlatApplicationOverride) &&
  isDefined(targetApplicationId) &&
  !exemptApplicationIds.has(targetApplicationId);

export const assertInstalledAppOwnedMetadataDeleteAllowedOrThrow = ({
  targetApplicationId,
  exemptApplicationIds,
  ownerFlatApplicationOverride,
  targetDescription,
}: {
  targetApplicationId: string | undefined;
  exemptApplicationIds: ReadonlySet<string>;
  ownerFlatApplicationOverride: unknown;
  targetDescription: string;
}): void => {
  if (
    isInstalledAppOwnedMetadataTarget({
      targetApplicationId,
      exemptApplicationIds,
      ownerFlatApplicationOverride,
    })
  ) {
    throw new ForbiddenException(
      `${targetDescription} принадлежит установленному приложению — удаление невозможно. Чтобы убрать его, удалите приложение целиком (uninstall), не отдельное поле или объект.`,
    );
  }
};

// MVP allowlist kept deliberately narrow (label/description/icon/translations
// — the exact shape of FieldMetadataOverrides/the object equivalent, Twenty's
// own "cosmetic override on a non-owned entity" concept). options is NOT
// included even for pure additions: UpdateFieldInput.options is a full-replace
// blob with no dedicated add-only operation, so cleanly telling "added an
// option" apart from "renamed/removed one" would need a value-level diff the
// platform itself doesn't validate structurally — simpler and safer to
// require any options change on an installed app's field to wait for a
// follow-up if the product needs it, than to guess wrong here.
export const assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow = ({
  targetApplicationId,
  exemptApplicationIds,
  ownerFlatApplicationOverride,
  updatePayload,
  allowedCosmeticKeys,
  targetDescription,
}: {
  targetApplicationId: string | undefined;
  exemptApplicationIds: ReadonlySet<string>;
  ownerFlatApplicationOverride: unknown;
  // GraphQL DTO instance (UpdateObjectPayload / UpdateFieldInput), not a
  // plain record — read via Object.entries below, which works on any object.
  updatePayload: object;
  allowedCosmeticKeys: ReadonlySet<string>;
  targetDescription: string;
}): void => {
  if (
    !isInstalledAppOwnedMetadataTarget({
      targetApplicationId,
      exemptApplicationIds,
      ownerFlatApplicationOverride,
    })
  ) {
    return;
  }

  // id/workspaceId identify the target, they are not a change being made to
  // it — FieldMetadataService.updateOneField's payload carries `id` inline
  // (UpdateFieldInput re-adds it as a @HideField after omitting it from the
  // GraphQL-facing PartialType), so this must be ignored here rather than
  // relying on every call site to strip it first.
  const NON_CHANGE_KEYS = new Set(['id', 'workspaceId']);
  const structuralKeys = Object.entries(updatePayload)
    .filter(([key, value]) => isDefined(value) && !NON_CHANGE_KEYS.has(key))
    .map(([key]) => key)
    .filter((key) => !allowedCosmeticKeys.has(key));

  if (structuralKeys.length > 0) {
    throw new ForbiddenException(
      `${targetDescription} принадлежит установленному приложению — разрешено менять только название, описание и иконку. Структурные изменения (${structuralKeys.join(', ')}) запрещены.`,
    );
  }
};
