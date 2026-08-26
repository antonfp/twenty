import { ERP_DOCUMENT_OBJECTS } from '@/erp-documents/constants/ErpDocumentObjects';
import { isDefined } from 'twenty-shared/utils';

// Mirrors erp-document-guard.service.ts / erp-document-line-guard.service.ts
// on the server: ANY update to a non-DRAFT document, or to a line of a
// non-DRAFT document, is rejected — no field is exempt (comment included).
// The client must match exactly, so this checks docStatus only, never a
// field name.
const DOC_STATUS_DRAFT = 'DRAFT';

const ERP_DOCUMENT_NAME_SINGULARS = new Set<string>(
  ERP_DOCUMENT_OBJECTS.NAME_SINGULARS,
);

// Derived from ERP_DOCUMENT_OBJECTS rather than a second hardcoded list:
// every ERP document object may own a `${doc}Line` child whose parent FK
// field is `${doc}Id` — the same convention the server guard wiring uses
// (see erp-sales/erp-stock/erp-purchases/erp-accounting
// *-guard.pre-query.hooks.ts). Documents without a line object (payment,
// supplierPayment) just leave their map entry unused.
const ERP_DOCUMENT_NAME_SINGULAR_BY_LINE_NAME_SINGULAR = new Map(
  ERP_DOCUMENT_OBJECTS.NAME_SINGULARS.map((docNameSingular) => [
    `${docNameSingular}Line`,
    docNameSingular,
  ]),
);

export const isErpDocumentObject = (objectNameSingular: string): boolean =>
  ERP_DOCUMENT_NAME_SINGULARS.has(objectNameSingular);

export const getErpDocumentParentNameSingularForLine = (
  objectNameSingular: string,
): string | undefined =>
  ERP_DOCUMENT_NAME_SINGULAR_BY_LINE_NAME_SINGULAR.get(objectNameSingular);

// Fails open (editable) when docStatus cannot be resolved yet — e.g. a
// document line rendered before its parent record has loaded into the
// record store. This is a UX affordance only: the server-side guard above
// still rejects the mutation, so failing open here never lets a write
// through that the server would otherwise block.
export const isErpDocumentFieldReadOnlyDueToDocStatus = (
  docStatus: unknown,
): boolean => isDefined(docStatus) && docStatus !== DOC_STATUS_DRAFT;
