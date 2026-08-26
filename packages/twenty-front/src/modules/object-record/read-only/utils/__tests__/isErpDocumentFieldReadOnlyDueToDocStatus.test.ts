import {
  getErpDocumentParentNameSingularForLine,
  isErpDocumentFieldReadOnlyDueToDocStatus,
  isErpDocumentObject,
} from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';

describe('isErpDocumentFieldReadOnlyDueToDocStatus', () => {
  it('is editable when docStatus is DRAFT', () => {
    expect(isErpDocumentFieldReadOnlyDueToDocStatus('DRAFT')).toBe(false);
  });

  it('is read-only when docStatus is POSTED', () => {
    expect(isErpDocumentFieldReadOnlyDueToDocStatus('POSTED')).toBe(true);
  });

  it('is read-only when docStatus is CANCELLED', () => {
    expect(isErpDocumentFieldReadOnlyDueToDocStatus('CANCELLED')).toBe(true);
  });

  it('fails open when docStatus cannot be resolved (undefined)', () => {
    expect(isErpDocumentFieldReadOnlyDueToDocStatus(undefined)).toBe(false);
  });

  it('fails open when docStatus cannot be resolved (null)', () => {
    expect(isErpDocumentFieldReadOnlyDueToDocStatus(null)).toBe(false);
  });
});

describe('isErpDocumentObject', () => {
  it('recognizes ERP document objects', () => {
    expect(isErpDocumentObject('salesInvoice')).toBe(true);
    expect(isErpDocumentObject('payment')).toBe(true);
  });

  it('leaves non-ERP objects untouched', () => {
    expect(isErpDocumentObject('person')).toBe(false);
    expect(isErpDocumentObject('company')).toBe(false);
    expect(isErpDocumentObject('salesInvoiceLine')).toBe(false);
  });
});

describe('getErpDocumentParentNameSingularForLine', () => {
  it('resolves the parent document for a known line object', () => {
    expect(getErpDocumentParentNameSingularForLine('salesInvoiceLine')).toBe(
      'salesInvoice',
    );
    expect(getErpDocumentParentNameSingularForLine('manualEntryLine')).toBe(
      'manualEntry',
    );
  });

  it('returns undefined for an object outside the ERP document map', () => {
    expect(
      getErpDocumentParentNameSingularForLine('randomLine'),
    ).toBeUndefined();
  });

  it('returns undefined for non-ERP objects', () => {
    expect(getErpDocumentParentNameSingularForLine('note')).toBeUndefined();
  });
});
