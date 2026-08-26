import { type Store } from 'jotai/vanilla/store';
import { isDefined } from 'twenty-shared/utils';

import { ERP_DOCUMENT_OBJECTS } from '@/erp-documents/constants/ErpDocumentObjects';
import { computeErpLineAmountMicros } from '@/erp-documents/utils/computeErpLineAmountMicros';
import { erpDocumentEffectiveDocStatusFamilySelector } from '@/object-record/read-only/utils/erpDocumentEffectiveDocStatusFamilySelector';
import { isErpDocumentFieldReadOnlyDueToDocStatus } from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { type FieldCurrencyValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { isDeeplyEqual } from '~/utils/isDeeplyEqual';

const LINE_OBJECTS_WITH_PRICE = new Set(
  ERP_DOCUMENT_OBJECTS.LINE_OBJECTS_WITH_PRICE_NAME_SINGULARS,
);

const QUANTITY_FIELD_NAME = 'quantity';
const PRICE_FIELD_NAME = 'price';
const AMOUNT_FIELD_NAME = 'amount';

// Task 3 (Phase 7): live-recalculate `amount` = quantity × price on an ERP
// document line, called from usePersistField right after it persists
// quantity or price. Not a re-derivation on every render — only fires when
// one of the two inputs was just persisted, so a manual edit to `amount`
// itself is left untouched until qty/price next changes (the semantic the
// brief asks for comes for free from only hooking these two field names).
export const maybeSyncErpLineAmountOnPersist = ({
  objectNameSingular,
  recordId,
  fieldName,
  store,
  updateOneRecord,
}: {
  objectNameSingular: string;
  recordId: string;
  fieldName: string;
  store: Store;
  updateOneRecord: ReturnType<typeof useUpdateOneRecord>['updateOneRecord'];
}): void => {
  if (!LINE_OBJECTS_WITH_PRICE.has(objectNameSingular)) {
    return;
  }

  if (fieldName !== QUANTITY_FIELD_NAME && fieldName !== PRICE_FIELD_NAME) {
    return;
  }

  // Fail-safe guard: the client already blocks entering edit mode on a
  // non-DRAFT line (Task 2) and the server rejects the mutation outright,
  // so this should be unreachable on a real non-DRAFT edit. Kept anyway in
  // case a future call site bypasses the per-cell read-only check. Same
  // fail-open-on-unresolved-docStatus stance as Task 2: this recalculation
  // is UX only, the server is the source of truth at Post regardless.
  const docStatus = store.get(
    erpDocumentEffectiveDocStatusFamilySelector.selectorFamily({
      objectNameSingular,
      recordId,
    }),
  );

  if (isErpDocumentFieldReadOnlyDueToDocStatus(docStatus)) {
    return;
  }

  const quantity = store.get(
    recordStoreFamilySelector.selectorFamily({
      recordId,
      fieldName: QUANTITY_FIELD_NAME,
    }),
  );
  const price = store.get(
    recordStoreFamilySelector.selectorFamily({
      recordId,
      fieldName: PRICE_FIELD_NAME,
    }),
  ) as FieldCurrencyValue | null | undefined;

  // Empty/null qty or price → leave `amount` as-is (do not write).
  if (
    typeof quantity !== 'number' ||
    !isDefined(price) ||
    !isDefined(price.amountMicros)
  ) {
    return;
  }

  const newAmount: FieldCurrencyValue = {
    currencyCode: price.currencyCode,
    amountMicros: computeErpLineAmountMicros(quantity, price.amountMicros),
  };

  const currentAmount = store.get(
    recordStoreFamilySelector.selectorFamily({
      recordId,
      fieldName: AMOUNT_FIELD_NAME,
    }),
  );

  if (isDeeplyEqual(newAmount, currentAmount)) {
    return;
  }

  store.set(
    recordStoreFamilySelector.selectorFamily({
      recordId,
      fieldName: AMOUNT_FIELD_NAME,
    }),
    newAmount,
  );

  updateOneRecord({
    objectNameSingular,
    idToUpdate: recordId,
    updateOneRecordInput: { [AMOUNT_FIELD_NAME]: newAmount },
  });
};
