import { renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { useIsRecordFieldReadOnlyDueToErpDocStatus } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnlyDueToErpDocStatus';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

const seedRecord = (
  recordId: string,
  fields: Record<string, unknown>,
): void => {
  jotaiStore.set(recordStoreFamilyState(recordId), {
    __typename: 'ErpTestRecord',
    id: recordId,
    ...fields,
  } as ObjectRecord);
};

const renderIsErpDocumentFieldReadOnly = (params: {
  objectNameSingular: string;
  recordId: string;
}) =>
  renderHook(() => useIsRecordFieldReadOnlyDueToErpDocStatus(params), {
    wrapper: Wrapper,
  }).result.current;

describe('useIsRecordFieldReadOnlyDueToErpDocStatus', () => {
  it('is editable when a document itself is DRAFT', () => {
    const recordId = 'sales-invoice-draft';
    seedRecord(recordId, { docStatus: 'DRAFT' });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoice',
        recordId,
      }),
    ).toBe(false);
  });

  it('is read-only when a document itself is POSTED', () => {
    const recordId = 'sales-invoice-posted';
    seedRecord(recordId, { docStatus: 'POSTED' });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoice',
        recordId,
      }),
    ).toBe(true);
  });

  it('is read-only when a document itself is CANCELLED', () => {
    const recordId = 'sales-invoice-cancelled';
    seedRecord(recordId, { docStatus: 'CANCELLED' });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoice',
        recordId,
      }),
    ).toBe(true);
  });

  it('is read-only for a line whose parent is POSTED, resolved from the record store without a network request', () => {
    const parentId = 'parent-posted';
    const lineId = 'line-of-posted-parent';
    seedRecord(parentId, { docStatus: 'POSTED' });
    seedRecord(lineId, { salesInvoiceId: parentId });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoiceLine',
        recordId: lineId,
      }),
    ).toBe(true);
  });

  it('is editable for a line whose parent is DRAFT', () => {
    const parentId = 'parent-draft';
    const lineId = 'line-of-draft-parent';
    seedRecord(parentId, { docStatus: 'DRAFT' });
    seedRecord(lineId, { salesInvoiceId: parentId });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoiceLine',
        recordId: lineId,
      }),
    ).toBe(false);
  });

  it('fails open (editable) when the parent record is not yet in the cache', () => {
    const lineId = 'line-with-uncached-parent';
    seedRecord(lineId, { salesInvoiceId: 'not-in-store' });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoiceLine',
        recordId: lineId,
      }),
    ).toBe(false);
  });

  it('fails open (editable) when the line record itself is not yet in the cache', () => {
    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'salesInvoiceLine',
        recordId: 'unloaded-line',
      }),
    ).toBe(false);
  });

  it('leaves non-ERP objects untouched even if a docStatus-shaped field is present', () => {
    const recordId = 'a-person';
    seedRecord(recordId, { docStatus: 'POSTED' });

    expect(
      renderIsErpDocumentFieldReadOnly({
        objectNameSingular: 'person',
        recordId,
      }),
    ).toBe(false);
  });
});
