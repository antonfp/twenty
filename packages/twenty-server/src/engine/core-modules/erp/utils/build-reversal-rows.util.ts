const REVERSIBLE_NUMERIC_FIELD_NAMES: readonly string[] = [
  'amount',
  'debit',
  'credit',
  'actualQty',
];

// Generated columns must not be copied into the reversal insert.
const NON_COPYABLE_FIELD_NAMES: readonly string[] = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
];

// Сторно: same register rows with measures negated, flagged isCancellation.
export const buildReversalRows = (
  originalRows: Record<string, unknown>[],
): Record<string, unknown>[] => {
  return originalRows.map((originalRow) => {
    const reversalRow: Record<string, unknown> = {};

    for (const [fieldName, fieldValue] of Object.entries(originalRow)) {
      if (NON_COPYABLE_FIELD_NAMES.includes(fieldName)) {
        continue;
      }

      reversalRow[fieldName] =
        REVERSIBLE_NUMERIC_FIELD_NAMES.includes(fieldName) &&
        typeof fieldValue === 'number'
          ? -fieldValue
          : fieldValue;
    }

    reversalRow.isCancellation = true;
    reversalRow.isCancelled = false;

    return reversalRow;
  });
};
