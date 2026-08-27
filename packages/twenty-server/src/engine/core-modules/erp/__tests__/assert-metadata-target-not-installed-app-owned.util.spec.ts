import { ForbiddenException } from '@nestjs/common';

import {
  assertInstalledAppOwnedMetadataDeleteAllowedOrThrow,
  assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow,
  FIELD_COSMETIC_UPDATE_KEYS,
  OBJECT_COSMETIC_UPDATE_KEYS,
} from 'src/engine/core-modules/erp/utils/assert-metadata-target-not-installed-app-owned.util';

const CUSTOM_APP_ID = 'app-custom';
const TWENTY_STANDARD_APP_ID = 'app-twenty-standard';
const ERP_SALES_APP_ID = 'app-erp-sales';

const EXEMPT_APPLICATION_IDS = new Set([CUSTOM_APP_ID, TWENTY_STANDARD_APP_ID]);

describe('assertInstalledAppOwnedMetadataDeleteAllowedOrThrow', () => {
  it('rejects deleting a field/object owned by an installed (non-standard, non-custom) application', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataDeleteAllowedOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        targetDescription: 'Поле «salesInvoice.total»',
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows deleting a custom (workspace-owned) field/object', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataDeleteAllowedOrThrow({
        targetApplicationId: CUSTOM_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        targetDescription: 'Поле «contract.discount»',
      }),
    ).not.toThrow();
  });

  it('allows deleting a Twenty-standard field/object — unchanged, pre-existing behavior', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataDeleteAllowedOrThrow({
        targetApplicationId: TWENTY_STANDARD_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        targetDescription: 'Поле «company.name»',
      }),
    ).not.toThrow();
  });

  it('allows an installed-app target when the caller passed an explicit ownerFlatApplication (trusted system caller, e.g. an upgrade command)', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataDeleteAllowedOrThrow({
        targetApplicationId: TWENTY_STANDARD_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: { id: TWENTY_STANDARD_APP_ID },
        targetDescription: 'Объект «favoriteFolder»',
      }),
    ).not.toThrow();
  });
});

describe('assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow', () => {
  it.each(['label', 'description', 'icon', 'translations'])(
    'allows a cosmetic-only field update (%s) on an installed-app field',
    (key) => {
      expect(() =>
        assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
          targetApplicationId: ERP_SALES_APP_ID,
          exemptApplicationIds: EXEMPT_APPLICATION_IDS,
          ownerFlatApplicationOverride: undefined,
          updatePayload: { [key]: 'new value' },
          allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
          targetDescription: 'Поле «salesInvoice.total»',
        }),
      ).not.toThrow();
    },
  );

  it.each([
    'name',
    'isNullable',
    'isUnique',
    'defaultValue',
    'options',
    'settings',
    'isActive',
    'isLabelSyncedWithName',
  ])(
    'rejects a structural field update (%s) on an installed-app field',
    (key) => {
      expect(() =>
        assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
          targetApplicationId: ERP_SALES_APP_ID,
          exemptApplicationIds: EXEMPT_APPLICATION_IDS,
          ownerFlatApplicationOverride: undefined,
          updatePayload: { [key]: 'new value' },
          allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
          targetDescription: 'Поле «salesInvoice.docStatus»',
        }),
      ).toThrow(ForbiddenException);
    },
  );

  it('allows label+description+icon together, still all cosmetic', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { label: 'Итого', description: 'x', icon: 'IconSum' },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «salesInvoice.total»',
      }),
    ).not.toThrow();
  });

  it('rejects when mixed with even one structural key', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { label: 'Итого', isNullable: true },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «salesInvoice.total»',
      }),
    ).toThrow(ForbiddenException);
  });

  it('ignores id/workspaceId in the payload — they identify the target, not a change', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { id: 'field-1', workspaceId: 'ws-1', label: 'Итого' },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «salesInvoice.total»',
      }),
    ).not.toThrow();
  });

  // Final whole-phase review Finding 1 (Major): isDefined(null) is false, so
  // an explicit null used to read as "not a change" and slip through as
  // cosmetic — the platform itself persists null as a real change
  // (mergeUpdateInExistingRecord.ts: `update[property] !== undefined`).
  it('rejects an explicit null on a structural key — null is a real change, not "unset"', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { defaultValue: null },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «salesInvoice.docStatus»',
      }),
    ).toThrow(ForbiddenException);
  });

  it('still ignores an undefined key (not present / explicitly undefined) — only omission means "no change"', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: ERP_SALES_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { defaultValue: undefined, label: 'Итого' },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «salesInvoice.total»',
      }),
    ).not.toThrow();
  });

  it('allows any update on a custom (workspace-owned) field, structural included', () => {
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: CUSTOM_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { name: 'renamed', isNullable: false },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «contract.discount»',
      }),
    ).not.toThrow();
  });

  it('allows any update on a Twenty-standard field, structural included — unchanged, pre-existing behavior', () => {
    // Matches successful-update-one-standard-field-metadata.integration-spec.ts:
    // isActive/options/defaultValue changes on opportunity.stage are expected
    // to keep succeeding — Twenty-standard has its own separate validation
    // for what it disallows (e.g. renaming `name`), this guard must not add
    // a second, conflicting one.
    expect(() =>
      assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
        targetApplicationId: TWENTY_STANDARD_APP_ID,
        exemptApplicationIds: EXEMPT_APPLICATION_IDS,
        ownerFlatApplicationOverride: undefined,
        updatePayload: { isActive: false, options: [], defaultValue: 'x' },
        allowedCosmeticKeys: FIELD_COSMETIC_UPDATE_KEYS,
        targetDescription: 'Поле «opportunity.stage»',
      }),
    ).not.toThrow();
  });

  it.each([
    'nameSingular',
    'namePlural',
    'shortcut',
    'color',
    'isActive',
    'isSearchable',
  ])(
    'rejects a structural object update (%s) on an installed-app object',
    (key) => {
      expect(() =>
        assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
          targetApplicationId: ERP_SALES_APP_ID,
          exemptApplicationIds: EXEMPT_APPLICATION_IDS,
          ownerFlatApplicationOverride: undefined,
          updatePayload: { [key]: 'x' },
          allowedCosmeticKeys: OBJECT_COSMETIC_UPDATE_KEYS,
          targetDescription: 'Объект «salesInvoice»',
        }),
      ).toThrow(ForbiddenException);
    },
  );

  it.each(['labelSingular', 'labelPlural', 'description', 'icon'])(
    'allows a cosmetic object update (%s) on an installed-app object',
    (key) => {
      expect(() =>
        assertInstalledAppOwnedMetadataUpdateIsCosmeticOrThrow({
          targetApplicationId: ERP_SALES_APP_ID,
          exemptApplicationIds: EXEMPT_APPLICATION_IDS,
          ownerFlatApplicationOverride: undefined,
          updatePayload: { [key]: 'x' },
          allowedCosmeticKeys: OBJECT_COSMETIC_UPDATE_KEYS,
          targetDescription: 'Объект «salesInvoice»',
        }),
      ).not.toThrow();
    },
  );
});
