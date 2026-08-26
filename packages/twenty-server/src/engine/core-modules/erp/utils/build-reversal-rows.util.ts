// stockValueDiff is the value measure of the stockLedgerEntry register
// installed by the erp-stock app (Phase 5); like the other measures it must
// flip sign in a сторно row (valuationRate/qtyAfter stay descriptive).
const REVERSIBLE_NUMERIC_FIELD_NAMES: readonly string[] = [
  'amount',
  'debit',
  'credit',
  'actualQty',
  'stockValueDiff',
];

// Repositories may flatten CURRENCY composites into `${field}AmountMicros` columns.
const REVERSIBLE_FLATTENED_FIELD_NAMES: readonly string[] =
  REVERSIBLE_NUMERIC_FIELD_NAMES.map((fieldName) => `${fieldName}AmountMicros`);

// Generated/system columns must not be copied into the reversal insert
// (searchVector is a GENERATED ALWAYS tsvector on searchable objects).
const NON_COPYABLE_FIELD_NAMES: readonly string[] = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'searchVector',
  'position',
];

const negateNumeric = (value: number | string): number | string =>
  typeof value === 'number' ? -value : String(-BigInt(value));

const isCurrencyComposite = (
  value: unknown,
): value is { amountMicros: number | string } =>
  typeof value === 'object' &&
  value !== null &&
  'amountMicros' in value &&
  (typeof (value as { amountMicros: unknown }).amountMicros === 'number' ||
    typeof (value as { amountMicros: unknown }).amountMicros === 'string');

// Сторно: same register rows with measures negated, flagged isCancellation.
// Measures can be plain numbers, CURRENCY composites ({amountMicros, currencyCode})
// or repository-flattened `${field}AmountMicros` columns — all are negated.
export const buildReversalRows = (
  originalRows: Record<string, unknown>[],
): Record<string, unknown>[] => {
  return originalRows.map((originalRow) => {
    const reversalRow: Record<string, unknown> = {};

    for (const [fieldName, fieldValue] of Object.entries(originalRow)) {
      if (NON_COPYABLE_FIELD_NAMES.includes(fieldName)) {
        continue;
      }

      if (
        REVERSIBLE_NUMERIC_FIELD_NAMES.includes(fieldName) &&
        isCurrencyComposite(fieldValue)
      ) {
        reversalRow[fieldName] = {
          ...fieldValue,
          amountMicros: negateNumeric(fieldValue.amountMicros),
        };
        continue;
      }

      if (
        (REVERSIBLE_NUMERIC_FIELD_NAMES.includes(fieldName) &&
          typeof fieldValue === 'number') ||
        (REVERSIBLE_FLATTENED_FIELD_NAMES.includes(fieldName) &&
          (typeof fieldValue === 'number' || typeof fieldValue === 'string'))
      ) {
        reversalRow[fieldName] = negateNumeric(fieldValue as number | string);
        continue;
      }

      reversalRow[fieldName] = fieldValue;
    }

    reversalRow.isCancellation = true;
    reversalRow.isCancelled = false;

    return reversalRow;
  });
};
