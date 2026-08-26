import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import {
  buildErpLineCreateInputFromItem,
  buildErpLineQuantityIncrementUpdateInput,
  computeErpLineTabConveyorTarget,
  getErpLineItemPickerConfig,
  getErpLineParentDocumentJoinColumnName,
} from '@/erp-documents/utils/erpLineSmartGrid';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

const fieldsOf = (
  names: string[],
): Pick<EnrichedObjectMetadataItem, 'fields'>['fields'] =>
  names.map((name) => ({ name })) as EnrichedObjectMetadataItem['fields'];

const FULL_LINE_FIELD_NAMES = [
  'name',
  'quantity',
  'price',
  'vatRate',
  'amount',
];
const NO_VAT_LINE_FIELD_NAMES = ['name', 'quantity', 'price', 'amount'];
const QUANTITY_ONLY_LINE_FIELD_NAMES = ['name', 'quantity'];
const NO_QUANTITY_LINE_FIELD_NAMES = ['name', 'amount'];

describe('getErpLineItemPickerConfig', () => {
  it('returns a config for an ERP line object with a quantity field (salesInvoiceLine)', () => {
    const config = getErpLineItemPickerConfig({
      nameSingular: 'salesInvoiceLine',
      fields: fieldsOf(FULL_LINE_FIELD_NAMES),
    });

    expect(config).toEqual({
      relationObjectMetadataNameSingular: 'item',
      relationRecordsFilter: {},
      nestedRelationJoinColumnName: 'itemId',
    });
  });

  it('returns a config for an ERP line object with only quantity, no price (stockTransferLine)', () => {
    const config = getErpLineItemPickerConfig({
      nameSingular: 'stockTransferLine',
      fields: fieldsOf(QUANTITY_ONLY_LINE_FIELD_NAMES),
    });

    expect(config).toBeDefined();
  });

  it('returns undefined for manualEntryLine (ERP line, but no quantity field)', () => {
    const config = getErpLineItemPickerConfig({
      nameSingular: 'manualEntryLine',
      fields: fieldsOf(NO_QUANTITY_LINE_FIELD_NAMES),
    });

    expect(config).toBeUndefined();
  });

  it('returns undefined for a non-ERP object even if it happens to have a quantity field', () => {
    const config = getErpLineItemPickerConfig({
      nameSingular: 'person',
      fields: fieldsOf(['name', 'quantity']),
    });

    expect(config).toBeUndefined();
  });
});

describe('buildErpLineCreateInputFromItem', () => {
  // __typename on both the record and the nested currency field mirrors what
  // an Apollo cache read (getRecordFromCache) actually returns — a currency
  // INPUT type rejects that subfield, so this also guards the strip.
  const baseItem: ObjectRecord = {
    __typename: 'Item',
    id: 'item-1',
    name: 'Настройка ПО',
    vatRate: 'VAT_20',
    price: {
      __typename: 'Currency',
      amountMicros: 54_000_000,
      currencyCode: 'RUB',
    },
  };

  it('fills itemId, quantity=1, name, price, vatRate and computed amount for a full line object', () => {
    const input = buildErpLineCreateInputFromItem({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      itemRecord: baseItem,
    });

    expect(input).toEqual({
      itemId: 'item-1',
      quantity: 1,
      name: 'Настройка ПО',
      price: { amountMicros: 54_000_000, currencyCode: 'RUB' },
      vatRate: 'VAT_20',
      amount: { amountMicros: 54_000_000, currencyCode: 'RUB' },
    });
  });

  it('omits vatRate for a line object without a vatRate field (goodsReceiptLine)', () => {
    const input = buildErpLineCreateInputFromItem({
      lineObjectMetadataItem: { fields: fieldsOf(NO_VAT_LINE_FIELD_NAMES) },
      itemRecord: baseItem,
    });

    expect(input.vatRate).toBeUndefined();
    expect(input.price).toEqual({
      amountMicros: 54_000_000,
      currencyCode: 'RUB',
    });
    expect(input.amount).toEqual({
      amountMicros: 54_000_000,
      currencyCode: 'RUB',
    });
  });

  it('omits price, vatRate and amount for a line object with only quantity (stockTransferLine)', () => {
    const input = buildErpLineCreateInputFromItem({
      lineObjectMetadataItem: {
        fields: fieldsOf(QUANTITY_ONLY_LINE_FIELD_NAMES),
      },
      itemRecord: baseItem,
    });

    expect(input).toEqual({
      itemId: 'item-1',
      quantity: 1,
      name: 'Настройка ПО',
    });
  });

  it('omits price and amount when the item itself has no price set', () => {
    const input = buildErpLineCreateInputFromItem({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      itemRecord: { ...baseItem, price: null },
    });

    expect(input.price).toBeUndefined();
    expect(input.amount).toBeUndefined();
    expect(input.vatRate).toBe('VAT_20');
  });

  it('falls back to an empty name when the item has none', () => {
    const input = buildErpLineCreateInputFromItem({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      itemRecord: { ...baseItem, name: undefined },
    });

    expect(input.name).toBe('');
  });
});

describe('getErpLineParentDocumentJoinColumnName', () => {
  it('derives the join column from the parent document for every ERP line object', () => {
    expect(getErpLineParentDocumentJoinColumnName('salesInvoiceLine')).toBe(
      'salesInvoiceId',
    );
    expect(getErpLineParentDocumentJoinColumnName('stockTransferLine')).toBe(
      'stockTransferId',
    );
    expect(getErpLineParentDocumentJoinColumnName('manualEntryLine')).toBe(
      'manualEntryId',
    );
  });

  it('returns undefined for a non-ERP line object', () => {
    expect(getErpLineParentDocumentJoinColumnName('person')).toBeUndefined();
  });
});

describe('buildErpLineQuantityIncrementUpdateInput', () => {
  // Task 6 quick-add's "duplicate" path (picking an item that is already a
  // line on this document): quantity+1 and a recomputed amount must land in
  // the SAME updateOneRecordInput object — a direct updateOneRecord call
  // bypasses Task 3's usePersistField-driven amount sync, so this is the
  // only place amount gets recomputed on increment.
  it('increments quantity and recomputes amount in the same input for a full line object', () => {
    const input = buildErpLineQuantityIncrementUpdateInput({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      existingLine: {
        __typename: 'SalesInvoiceLine',
        id: 'line-1',
        quantity: 2,
        price: { amountMicros: 54_000_000, currencyCode: 'RUB' },
      },
    });

    expect(input).toEqual({
      quantity: 3,
      amount: { amountMicros: 162_000_000, currencyCode: 'RUB' },
    });
  });

  it('treats a missing/non-numeric quantity as 0 before incrementing', () => {
    const input = buildErpLineQuantityIncrementUpdateInput({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      existingLine: {
        __typename: 'SalesInvoiceLine',
        id: 'line-1',
        quantity: null,
        price: { amountMicros: 54_000_000, currencyCode: 'RUB' },
      },
    });

    expect(input.quantity).toBe(1);
  });

  it('omits amount for a line object with no amount field (stockTransferLine)', () => {
    const input = buildErpLineQuantityIncrementUpdateInput({
      lineObjectMetadataItem: {
        fields: fieldsOf(QUANTITY_ONLY_LINE_FIELD_NAMES),
      },
      existingLine: {
        __typename: 'StockTransferLine',
        id: 'line-1',
        quantity: 1,
        price: { amountMicros: 54_000_000, currencyCode: 'RUB' },
      },
    });

    expect(input).toEqual({ quantity: 2 });
  });

  it('omits amount when the existing line has no price to recompute from', () => {
    const input = buildErpLineQuantityIncrementUpdateInput({
      lineObjectMetadataItem: { fields: fieldsOf(FULL_LINE_FIELD_NAMES) },
      existingLine: {
        __typename: 'SalesInvoiceLine',
        id: 'line-1',
        quantity: 1,
        price: null,
      },
    });

    expect(input).toEqual({ quantity: 2 });
  });
});

describe('computeErpLineTabConveyorTarget', () => {
  it('falls through to default when not eligible', () => {
    expect(
      computeErpLineTabConveyorTarget({
        isEligible: false,
        focusPosition: { row: 0, column: 0 },
        numberOfColumns: 5,
      }),
    ).toEqual({ type: 'default' });
  });

  it('falls through to default when there is no focus position', () => {
    expect(
      computeErpLineTabConveyorTarget({
        isEligible: true,
        focusPosition: undefined,
        numberOfColumns: 5,
      }),
    ).toEqual({ type: 'default' });
  });

  it('opens the item picker for the next row when Tab lands on the last column', () => {
    expect(
      computeErpLineTabConveyorTarget({
        isEligible: true,
        focusPosition: { row: 2, column: 4 },
        numberOfColumns: 5,
      }),
    ).toEqual({ type: 'openItemPicker' });
  });

  it('reopens edit mode on the next cell when Tab is not on the last column', () => {
    expect(
      computeErpLineTabConveyorTarget({
        isEligible: true,
        focusPosition: { row: 2, column: 1 },
        numberOfColumns: 5,
      }),
    ).toEqual({ type: 'openCell', column: 2 });
  });

  it('treats a single-column row as its own last column (opens the picker)', () => {
    expect(
      computeErpLineTabConveyorTarget({
        isEligible: true,
        focusPosition: { row: 0, column: 0 },
        numberOfColumns: 1,
      }),
    ).toEqual({ type: 'openItemPicker' });
  });
});
