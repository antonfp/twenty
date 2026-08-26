import {
  getErpDocumentParentNameSingularForLine,
  isErpDocumentObject,
} from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { recordStoreFamilyState } from '@/object-record/record-store/states/recordStoreFamilyState';
import { createAtomFamilySelector } from '@/ui/utilities/state/jotai/utils/createAtomFamilySelector';
import { isDefined } from 'twenty-shared/utils';

// One atom read (not two or three) per field cell: for a document line, the
// parent id lives on the line's own already-loaded record, and the parent
// record itself is already in the record store — the document page that
// renders the line loaded it. No network request is made here.
export const erpDocumentEffectiveDocStatusFamilySelector =
  createAtomFamilySelector<
    unknown,
    { objectNameSingular: string; recordId: string }
  >({
    key: 'erpDocumentEffectiveDocStatusFamilySelector',
    get:
      ({ objectNameSingular, recordId }) =>
      ({ get }) => {
        if (isErpDocumentObject(objectNameSingular)) {
          return get(recordStoreFamilyState, recordId)?.docStatus;
        }

        const parentNameSingular =
          getErpDocumentParentNameSingularForLine(objectNameSingular);

        if (!isDefined(parentNameSingular)) {
          return undefined;
        }

        const parentId = get(recordStoreFamilyState, recordId)?.[
          `${parentNameSingular}Id`
        ];

        if (typeof parentId !== 'string') {
          return undefined;
        }

        return get(recordStoreFamilyState, parentId)?.docStatus;
      },
  });
