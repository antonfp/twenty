import { erpDocumentEffectiveDocStatusFamilySelector } from '@/object-record/read-only/utils/erpDocumentEffectiveDocStatusFamilySelector';
import { isErpDocumentFieldReadOnlyDueToDocStatus } from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';

type UseIsRecordFieldReadOnlyDueToErpDocStatusParams = {
  objectNameSingular: string;
  recordId: string;
};

// Phase 7 Task 2 extension point: an ERP document (or one of its lines) goes
// read-only in the UI the instant docStatus leaves DRAFT, instead of only
// after a failed mutation. Every field is affected uniformly — the server
// guard (erp-document-guard.service.ts) blocks all updates on a non-DRAFT
// document, no field exempt, so this checks docStatus only.
export const useIsRecordFieldReadOnlyDueToErpDocStatus = ({
  objectNameSingular,
  recordId,
}: UseIsRecordFieldReadOnlyDueToErpDocStatusParams): boolean => {
  const docStatus = useAtomFamilySelectorValue(
    erpDocumentEffectiveDocStatusFamilySelector,
    { objectNameSingular, recordId },
  );

  return isErpDocumentFieldReadOnlyDueToDocStatus(docStatus);
};
