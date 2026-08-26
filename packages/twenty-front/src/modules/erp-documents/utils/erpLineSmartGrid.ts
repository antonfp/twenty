import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getErpDocumentParentNameSingularForLine } from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { type FieldCurrencyValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type RecordTableWidgetNestedRelationCreateThrough } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { computeErpLineAmountMicros } from '@/erp-documents/utils/computeErpLineAmountMicros';
import {
  computeRelationGqlFieldJoinColumnName,
  isDefined,
} from 'twenty-shared/utils';

const ITEM_OBJECT_NAME_SINGULAR = 'item';
const ITEM_RELATION_FIELD_NAME = 'item';
const QUANTITY_FIELD_NAME = 'quantity';
const NAME_FIELD_NAME = 'name';
const PRICE_FIELD_NAME = 'price';
const VAT_RATE_FIELD_NAME = 'vatRate';
const AMOUNT_FIELD_NAME = 'amount';
const DEFAULT_QUANTITY_ON_CREATE = 1;

const ITEM_JOIN_COLUMN_NAME = computeRelationGqlFieldJoinColumnName({
  name: ITEM_RELATION_FIELD_NAME,
});

// Task 5 (Phase 7), "умный грид": "+ Строка" opens an item picker instead of
// an empty row. The platform's own nested-relation picker
// (getFieldWidgetNestedRelationCreateThrough) only activates for a
// ONE_TO_MANY first hop; `item` is MANY_TO_ONE from the line's side, so it
// never activates there — this producer fills that gap for the item picker
// specifically. Gate is "has a quantity field", not "has an item relation":
// manualEntryLine also carries an `item` relation (an optional analytics
// tag), but no quantity/price/vatRate to autofill — Anton's ruling excludes
// it from the smart grid, and it has no quantity field to key off anyway.
export const getErpLineItemPickerConfig = (
  lineObjectMetadataItem: Pick<
    EnrichedObjectMetadataItem,
    'nameSingular' | 'fields'
  >,
): RecordTableWidgetNestedRelationCreateThrough | undefined => {
  const isErpLine = isDefined(
    getErpDocumentParentNameSingularForLine(
      lineObjectMetadataItem.nameSingular,
    ),
  );
  const hasQuantityField = lineObjectMetadataItem.fields.some(
    (field) => field.name === QUANTITY_FIELD_NAME,
  );

  if (!isErpLine || !hasQuantityField) {
    return undefined;
  }

  return {
    relationObjectMetadataNameSingular: ITEM_OBJECT_NAME_SINGULAR,
    relationRecordsFilter: {},
    nestedRelationJoinColumnName: ITEM_JOIN_COLUMN_NAME,
  };
};

// Builds the ONE createOne input for a line created through the item picker:
// {itemId, quantity: 1, name, price?, vatRate?, amount?} — the parent
// document's own FK is filled separately by createNewIndexRecord's existing
// filter-based prefill (buildRecordInputFromFilters), so it is not repeated
// here. Only fills price/vatRate/amount when the target line object actually
// has that field (goodsReceiptLine/goodsPostingLine have no vatRate;
// stockTransferLine/goodsWriteOffLine have neither price nor amount) —
// checked dynamically against the line object's own fields, not a second
// hardcoded per-object list. amount is computed client-side (same kopeck
// rounding as Task 3's computeErpLineAmountMicros) because createOneRecord
// does not go through usePersistField, so Task 3's persist-hook never fires
// on creation.
export const buildErpLineCreateInputFromItem = ({
  lineObjectMetadataItem,
  itemRecord,
}: {
  lineObjectMetadataItem: Pick<EnrichedObjectMetadataItem, 'fields'>;
  itemRecord: ObjectRecord;
}): Partial<ObjectRecord> => {
  const lineFieldNames = new Set(
    lineObjectMetadataItem.fields.map((field) => field.name),
  );

  const input: Partial<ObjectRecord> = {
    [ITEM_JOIN_COLUMN_NAME]: itemRecord.id,
    [QUANTITY_FIELD_NAME]: DEFAULT_QUANTITY_ON_CREATE,
    [NAME_FIELD_NAME]: itemRecord.name ?? '',
  };

  const itemPrice = itemRecord.price as FieldCurrencyValue | null | undefined;

  if (
    lineFieldNames.has(PRICE_FIELD_NAME) &&
    isDefined(itemPrice?.amountMicros)
  ) {
    // itemPrice comes from an Apollo cache read (getRecordFromCache), which
    // carries a __typename — a currency INPUT type rejects that subfield, so
    // rebuild a clean {amountMicros, currencyCode} rather than passing the
    // cached object straight through.
    input[PRICE_FIELD_NAME] = {
      amountMicros: itemPrice.amountMicros,
      currencyCode: itemPrice.currencyCode,
    } satisfies FieldCurrencyValue;

    if (lineFieldNames.has(AMOUNT_FIELD_NAME)) {
      input[AMOUNT_FIELD_NAME] = {
        currencyCode: itemPrice.currencyCode,
        amountMicros: computeErpLineAmountMicros(
          DEFAULT_QUANTITY_ON_CREATE,
          itemPrice.amountMicros,
        ),
      } satisfies FieldCurrencyValue;
    }
  }

  if (
    lineFieldNames.has(VAT_RATE_FIELD_NAME) &&
    isDefined(itemRecord.vatRate)
  ) {
    input[VAT_RATE_FIELD_NAME] = itemRecord.vatRate;
  }

  return input;
};

export type ErpLineTabConveyorTarget =
  | { type: 'openItemPicker' }
  | { type: 'openCell'; column: number }
  | { type: 'default' };

// Tab-конвейер (Task 5): decides what Tab should do next on an ERP line row
// with an item picker. Pure/testable on purpose — the platform's own Tab
// handling (RecordTableCellFieldInput.handleTab → onMoveFocus('right') →
// useRecordTableMoveFocusedCell.moveRight) only updates the internal
// focus-position atom and never reopens edit mode on the new cell, so
// keyboard focus is lost to <body> after every Tab (a platform-wide gap, not
// fixed generally here — see task report). This is scoped to ERP line
// objects: last column → open the item picker for the next row (the
// conveyor); any other column → reopen edit mode on the next cell so Tab
// keeps working across the row; not eligible/no focus → fall through to the
// platform's default moveFocus.
export const computeErpLineTabConveyorTarget = ({
  isEligible,
  focusPosition,
  numberOfColumns,
}: {
  isEligible: boolean;
  focusPosition: { row: number; column: number } | undefined | null;
  numberOfColumns: number;
}): ErpLineTabConveyorTarget => {
  if (!isEligible || !isDefined(focusPosition) || numberOfColumns <= 0) {
    return { type: 'default' };
  }

  const isLastColumn = focusPosition.column === numberOfColumns - 1;

  if (isLastColumn) {
    return { type: 'openItemPicker' };
  }

  return { type: 'openCell', column: focusPosition.column + 1 };
};
