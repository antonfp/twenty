import {
  buildErpLineCreateInputFromItem,
  buildErpLineQuantityIncrementUpdateInput,
  getErpLineItemPickerConfig,
  getErpLineParentDocumentJoinColumnName,
  ITEM_JOIN_COLUMN_NAME,
} from '@/erp-documents/utils/erpLineSmartGrid';
import { useGetRecordFromCache } from '@/object-record/cache/hooks/useGetRecordFromCache';
import { useLazyFindManyRecords } from '@/object-record/hooks/useLazyFindManyRecords';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { RecordFilterValueDependenciesContext } from '@/object-record/record-filter/contexts/RecordFilterValueDependenciesContext';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { erpDocumentEffectiveDocStatusFamilySelector } from '@/object-record/read-only/utils/erpDocumentEffectiveDocStatusFamilySelector';
import { isErpDocumentFieldReadOnlyDueToDocStatus } from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { useRecordsForSelect } from '@/object-record/select/hooks/useRecordsForSelect';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  type KeyboardEvent,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';
import { MenuItem } from 'twenty-ui/navigation';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  position: relative;
`;

const StyledInputRow = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledInput = styled.input`
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  outline: none;
  padding: ${themeCssVariables.spacing[1]} 0;

  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }
`;

const StyledSuggestions = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  left: ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[1]};
  max-height: 240px;
  overflow-y: auto;
  position: absolute;
  right: ${themeCssVariables.spacing[3]};
  top: 100%;
  /* The table's sticky column headers/cells set their own z-index inside
     the SAME stacking context (StyledContainer has no z-index of its own,
     so it doesn't isolate one) — a low z-index here loses to them and the
     list renders invisibly underneath the table. Same top-layer token the
     platform's own RecordTableColumnHeadDropdownMenu uses for this exact
     "float above the table" problem. */
  z-index: ${themeCssVariables.lastLayerZIndex};
`;

// Task 6 (Phase 7), quick-add: a persistent "Добавить позицию" input above
// the ERP line table (МойСклад pattern) — type name/sku, Enter creates a
// qty=1 line via Task 5's own item-picker config/create-input builders, and
// focus stays put for the next scan/type. Picking an item that is already a
// line on THIS document increments its quantity instead of adding a
// duplicate row.
//
// Mounted from RecordTableWidgetRendererContent only when
// getErpLineItemPickerConfig(objectMetadataItem) is defined (the same 7-of-8
// ERP line objects Task 5 targets — manualEntryLine has no quantity field
// and is excluded there already), so every hook below only ever runs for an
// eligible line table. The isDefined guard here is a cheap belt-and-braces
// check for standalone rendering/testing, not the real gate.
export const RecordTableWidgetQuickAddRow = () => {
  const { objectMetadataItem, objectNameSingular } =
    useRecordIndexContextOrThrow();

  const erpLineItemPickerConfig = useMemo(
    () => getErpLineItemPickerConfig(objectMetadataItem),
    [objectMetadataItem],
  );

  const parentJoinColumnName = useMemo(
    () => getErpLineParentDocumentJoinColumnName(objectNameSingular),
    [objectNameSingular],
  );

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  // Same parent-document dependency Task 5 reads for the docStatus gate on
  // "+ Строка" — already seeded for the view's own row filter, no extra
  // fetch needed.
  const { currentRecord } = useContext(RecordFilterValueDependenciesContext);

  const erpParentDocStatus = useAtomFamilySelectorValue(
    erpDocumentEffectiveDocStatusFamilySelector,
    {
      objectNameSingular: currentRecord?.objectMetadataNameSingular ?? '',
      recordId: currentRecord?.id ?? '',
    },
  );

  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Blocks a second Enter/click from firing while the previous pick's
  // create-or-increment mutation is still in flight — without this, a
  // barcode scanner sending two scans in quick succession (the use case
  // this input is laid groundwork for) could create the same line twice or
  // race two increments against a stale quantity. Deliberately a ref, not
  // state: this mutex must be readable synchronously inside the same
  // handler call that sets it, not after the next render.
  // oxlint-disable-next-line twenty/no-state-useref
  const isProcessingPickRef = useRef(false);

  const { recordsToSelect } = useRecordsForSelect({
    searchFilterText: searchText,
    selectedIds: [],
    objectNameSingular:
      erpLineItemPickerConfig?.relationObjectMetadataNameSingular ?? 'item',
    allowRequestsToTwentyIcons: true,
    filter: erpLineItemPickerConfig?.relationRecordsFilter ?? {},
  });

  const canSearchExistingLinesForDuplicate =
    isDefined(parentJoinColumnName) && isDefined(currentRecord?.id);

  const { findManyRecordsLazy: findExistingLinesForDocument } =
    useLazyFindManyRecords({
      objectNameSingular,
      filter: canSearchExistingLinesForDuplicate
        ? { [parentJoinColumnName as string]: { eq: currentRecord?.id } }
        : {},
      // ponytail: one page of up to QUERY_MAX_RECORDS (200) lines — a
      // document with more lines than that won't get deduped against its
      // tail; add pagination here if that ceiling turns out to matter.
      limit: QUERY_MAX_RECORDS,
      fetchPolicy: 'network-only',
    });

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const getItemRecordFromCache = useGetRecordFromCache({
    objectNameSingular: 'item',
  });

  const resetInput = useCallback(() => {
    setSearchText('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }, []);

  const handleItemPicked = useCallback(
    async (itemId: string) => {
      if (isProcessingPickRef.current) {
        return;
      }

      isProcessingPickRef.current = true;

      try {
        const itemRecord = getItemRecordFromCache(itemId);

        if (!isDefined(itemRecord)) {
          return;
        }

        const existingLine = canSearchExistingLinesForDuplicate
          ? (await findExistingLinesForDocument()).records?.find(
              (record) => record[ITEM_JOIN_COLUMN_NAME] === itemId,
            )
          : undefined;

        if (isDefined(existingLine)) {
          await updateOneRecord({
            objectNameSingular,
            idToUpdate: existingLine.id,
            updateOneRecordInput: buildErpLineQuantityIncrementUpdateInput({
              lineObjectMetadataItem: objectMetadataItem,
              existingLine,
            }),
          });
        } else {
          await createNewIndexRecord({
            position: 'last',
            ...buildErpLineCreateInputFromItem({
              lineObjectMetadataItem: objectMetadataItem,
              itemRecord,
            }),
          });
        }

        resetInput();
      } finally {
        isProcessingPickRef.current = false;
      }
    },
    [
      getItemRecordFromCache,
      canSearchExistingLinesForDuplicate,
      findExistingLinesForDocument,
      updateOneRecord,
      objectNameSingular,
      objectMetadataItem,
      createNewIndexRecord,
      resetInput,
    ],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) =>
        Math.min(index + 1, recordsToSelect.length - 1),
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const pickedRecord = recordsToSelect[highlightedIndex];

      if (isDefined(pickedRecord)) {
        handleItemPicked(pickedRecord.id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      resetInput();
    }
  };

  if (!isDefined(erpLineItemPickerConfig)) {
    return null;
  }

  if (
    !canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    })
  ) {
    return null;
  }

  if (hasAnySoftDeleteFilterOnView) {
    return null;
  }

  // Same fail-open-on-unresolved-docStatus stance as Task 5: hide only once
  // a non-DRAFT status actually resolves.
  if (isErpDocumentFieldReadOnlyDueToDocStatus(erpParentDocStatus)) {
    return null;
  }

  const clampedHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(recordsToSelect.length - 1, 0),
  );

  return (
    <StyledContainer>
      <StyledInputRow>
        <StyledInput
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t`Добавить позицию: название, код или артикул…`}
        />
      </StyledInputRow>
      {searchText.length > 0 && recordsToSelect.length > 0 && (
        <StyledSuggestions>
          {recordsToSelect.map((record, index) => (
            <MenuItem
              key={record.id}
              text={record.name}
              focused={index === clampedHighlightedIndex}
              onClick={() => handleItemPicked(record.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
            />
          ))}
        </StyledSuggestions>
      )}
    </StyledContainer>
  );
};
