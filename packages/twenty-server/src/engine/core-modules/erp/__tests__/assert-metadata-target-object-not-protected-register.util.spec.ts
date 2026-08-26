import { ForbiddenException } from '@nestjs/common';

import { assertMetadataTargetObjectNotProtectedRegisterOrThrow } from 'src/engine/core-modules/erp/utils/assert-metadata-target-object-not-protected-register.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

const SALES_INVOICE_ID = 'object-sales-invoice';

const REGISTER_IDS: Record<string, string> = {
  partyLedgerEntry: 'object-party-ledger-entry',
  stockLedgerEntry: 'object-stock-ledger-entry',
  itemBalance: 'object-item-balance',
  glEntry: 'object-gl-entry',
};

const flatObjectMetadataMaps = {
  universalIdentifierById: {
    [SALES_INVOICE_ID]: 'u-sales-invoice',
    ...Object.fromEntries(
      Object.entries(REGISTER_IDS).map(([name, id]) => [id, `u-${name}`]),
    ),
  },
  byUniversalIdentifier: {
    'u-sales-invoice': { id: SALES_INVOICE_ID, nameSingular: 'salesInvoice' },
    ...Object.fromEntries(
      Object.entries(REGISTER_IDS).map(([name, id]) => [
        `u-${name}`,
        { id, nameSingular: name },
      ]),
    ),
  },
} as unknown as FlatEntityMaps<FlatObjectMetadata>;

// This single assertion is called from ObjectMetadataService.updateOneObject/
// deleteManyObjectMetadatas, FieldMetadataService.createManyFields/
// updateOneField/deleteOneField, and ViewService.createOne — the shared
// choke point EVERY caller (Settings UI resolver, REST /metadata controller,
// AI tool factory) routes a single object/field/view mutation through (T2
// review Finding 1). Testing it once, parameterized over all 4 registers,
// covers the logic both the field-mutation and view-mutation call sites rely
// on — they differ only in which objectMetadataId they resolve before calling
// this, not in what it does with it.
describe('assertMetadataTargetObjectNotProtectedRegisterOrThrow', () => {
  it.each(Object.entries(REGISTER_IDS))(
    'rejects any mutation targeting register %s',
    (nameSingular, objectMetadataId) => {
      expect(() =>
        assertMetadataTargetObjectNotProtectedRegisterOrThrow({
          flatObjectMetadataMaps,
          objectMetadataId,
        }),
      ).toThrow(ForbiddenException);

      try {
        assertMetadataTargetObjectNotProtectedRegisterOrThrow({
          flatObjectMetadataMaps,
          objectMetadataId,
        });
      } catch (error) {
        expect((error as ForbiddenException).message).toContain(nameSingular);
      }
    },
  );

  it('allows mutations targeting a non-register object', () => {
    expect(() =>
      assertMetadataTargetObjectNotProtectedRegisterOrThrow({
        flatObjectMetadataMaps,
        objectMetadataId: SALES_INVOICE_ID,
      }),
    ).not.toThrow();
  });

  it('is a no-op when objectMetadataId is undefined (e.g. update-view mode, no object targeted)', () => {
    expect(() =>
      assertMetadataTargetObjectNotProtectedRegisterOrThrow({
        flatObjectMetadataMaps,
        objectMetadataId: undefined,
      }),
    ).not.toThrow();
  });

  it('is a no-op when the id does not resolve to any known object (creation of a brand-new object)', () => {
    expect(() =>
      assertMetadataTargetObjectNotProtectedRegisterOrThrow({
        flatObjectMetadataMaps,
        objectMetadataId: 'unknown-id',
      }),
    ).not.toThrow();
  });
});
