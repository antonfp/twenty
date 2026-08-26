import { maybeSyncErpLineAmountOnPersist } from '@/erp-documents/utils/maybeSyncErpLineAmountOnPersist';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const seedRecord = (recordId: string, fields: Record<string, unknown>) => {
  jotaiStore.set(recordStoreFamilyState(recordId), {
    __typename: 'ErpTestRecord',
    id: recordId,
    ...fields,
  } as ObjectRecord);
};

const getStoredField = (recordId: string, fieldName: string) =>
  jotaiStore.get(
    recordStoreFamilySelector.selectorFamily({ recordId, fieldName }),
  );

describe('maybeSyncErpLineAmountOnPersist', () => {
  beforeEach(() => {
    resetJotaiStore();
  });

  it('recomputes amount when quantity was just persisted on a DRAFT line', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-1';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 3,
      price: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      amount: null,
    });
    const updateOneRecord = jest.fn().mockResolvedValue({});

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    const expectedAmount = { amountMicros: 1_500_000_000, currencyCode: 'RUB' };

    expect(getStoredField(lineId, 'amount')).toEqual(expectedAmount);
    expect(updateOneRecord).toHaveBeenCalledWith({
      objectNameSingular: 'salesInvoiceLine',
      idToUpdate: lineId,
      updateOneRecordInput: { amount: expectedAmount },
    });
  });

  it('recomputes amount when price was just persisted on a DRAFT line', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-2';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 2,
      price: { amountMicros: 100_000_000, currencyCode: 'RUB' },
      amount: null,
    });
    const updateOneRecord = jest.fn().mockResolvedValue({});

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'price',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toEqual({
      amountMicros: 200_000_000,
      currencyCode: 'RUB',
    });
    expect(updateOneRecord).toHaveBeenCalledTimes(1);
  });

  it('leaves amount as-is when quantity is null', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-3';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: null,
      price: { amountMicros: 100_000_000, currencyCode: 'RUB' },
      amount: { amountMicros: 999, currencyCode: 'RUB' },
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toEqual({
      amountMicros: 999,
      currencyCode: 'RUB',
    });
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('leaves amount as-is when price is null', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-4';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 5,
      price: null,
      amount: null,
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'price',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toBeNull();
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('computes amount 0 when quantity is 0 (boundary, not skipped)', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-5';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 0,
      price: { amountMicros: 100_000_000, currencyCode: 'RUB' },
      amount: null,
    });
    const updateOneRecord = jest.fn().mockResolvedValue({});

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toEqual({
      amountMicros: 0,
      currencyCode: 'RUB',
    });
    expect(updateOneRecord).toHaveBeenCalledTimes(1);
  });

  it('does not touch a non-DRAFT (POSTED) line even with valid quantity/price', () => {
    const parentId = 'posted-invoice';
    const lineId = 'line-6';
    seedRecord(parentId, { docStatus: 'POSTED' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 3,
      price: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      amount: { amountMicros: 1, currencyCode: 'RUB' },
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toEqual({
      amountMicros: 1,
      currencyCode: 'RUB',
    });
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('leaves a manually-edited amount untouched when the persisted field is amount itself', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-7';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 3,
      price: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      amount: { amountMicros: 777, currencyCode: 'RUB' },
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'amount',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toEqual({
      amountMicros: 777,
      currencyCode: 'RUB',
    });
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('leaves non-price line objects untouched (stockTransferLine has no price)', () => {
    const lineId = 'transfer-line-1';
    seedRecord(lineId, { quantity: 3, amount: null });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'stockTransferLine',
      recordId: lineId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(lineId, 'amount')).toBeNull();
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('leaves non-ERP objects untouched even with quantity/price-shaped fields', () => {
    const recordId = 'a-person';
    seedRecord(recordId, {
      quantity: 3,
      price: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      amount: null,
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'person',
      recordId,
      fieldName: 'quantity',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(getStoredField(recordId, 'amount')).toBeNull();
    expect(updateOneRecord).not.toHaveBeenCalled();
  });

  it('does not re-call updateOneRecord when the recomputed amount is unchanged', () => {
    const parentId = 'draft-invoice';
    const lineId = 'line-8';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, {
      salesInvoiceId: parentId,
      quantity: 2,
      price: { amountMicros: 100_000_000, currencyCode: 'RUB' },
      amount: { amountMicros: 200_000_000, currencyCode: 'RUB' },
    });
    const updateOneRecord = jest.fn();

    maybeSyncErpLineAmountOnPersist({
      objectNameSingular: 'salesInvoiceLine',
      recordId: lineId,
      fieldName: 'price',
      store: jotaiStore,
      updateOneRecord,
    });

    expect(updateOneRecord).not.toHaveBeenCalled();
  });
});
