import { useGetRecordFromCache } from '@/object-record/cache/hooks/useGetRecordFromCache';
import {
  buildErpLineCreateInputFromItem,
  getErpLineItemPickerConfig,
} from '@/erp-documents/utils/erpLineSmartGrid';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { erpDocumentEffectiveDocStatusFamilySelector } from '@/object-record/read-only/utils/erpDocumentEffectiveDocStatusFamilySelector';
import {
  getErpDocumentParentNameSingularForLine,
  isErpDocumentFieldReadOnlyDueToDocStatus,
} from '@/object-record/read-only/utils/isErpDocumentFieldReadOnlyDueToDocStatus';
import { RecordFilterValueDependenciesContext } from '@/object-record/record-filter/contexts/RecordFilterValueDependenciesContext';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { useOpenRecordTableCell } from '@/object-record/record-table/record-table-cell/hooks/useOpenRecordTableCell';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { RecordTableActionRow } from '@/object-record/record-table/record-table-row/components/RecordTableActionRow';
import { RecordTableWidgetNestedRelationAddNewRow } from '@/object-record/record-table-widget/components/RecordTableWidgetNestedRelationAddNewRow';
import { RecordTableWidgetContext } from '@/object-record/record-table-widget/contexts/RecordTableWidgetContext';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useLoadRecordsToVirtualRows } from '@/object-record/record-table/virtualization/hooks/useLoadRecordsToVirtualRows';
import { totalNumberOfRecordsToVirtualizeComponentState } from '@/object-record/record-table/virtualization/states/totalNumberOfRecordsToVirtualizeComponentState';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { t } from '@lingui/core/macro';
import { useCallback, useContext, useMemo } from 'react';
import { type ObjectRecord } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconPlus } from 'twenty-ui/icon';

const QUANTITY_FIELD_NAME = 'quantity';

export const RecordTableNoRecordGroupAddNew = () => {
  const { objectMetadataItem, recordTableId, visibleRecordFields } =
    useRecordTableContextOrThrow();
  const { fieldDefinitionByFieldMetadataItemId } =
    useRecordIndexContextOrThrow();

  const nestedRelationCreateThrough = useContext(
    RecordTableWidgetContext,
  )?.nestedRelationCreateThrough;

  // "Умный грид" (Task 5): item picker for ERP line objects. Undefined for
  // manualEntryLine and every non-ERP object, so the platform's plain
  // "+ Add New" button (or its own nested-relation picker, for the
  // Company→People-style widgets this component already served) keeps
  // working exactly as before.
  const erpLineItemPickerConfig = useMemo(
    () => getErpLineItemPickerConfig(objectMetadataItem),
    [objectMetadataItem],
  );

  const isRecordTableCellsNonEditable = useAtomComponentStateValue(
    isRecordTableCellsNonEditableComponentState,
  );

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const totalNumberOfRecordsToVirtualize = useAtomComponentStateValue(
    totalNumberOfRecordsToVirtualizeComponentState,
  );

  const { loadRecordsToVirtualRows } = useLoadRecordsToVirtualRows();
  const { upsertRecordsInStore } = useUpsertRecordsInStore();
  const { openTableCell } = useOpenRecordTableCell(recordTableId);

  const getItemRecordFromCache = useGetRecordFromCache({
    objectNameSingular: 'item',
  });

  // The document line's parent id/type — same dependency
  // FieldWidgetRelationTable already seeds for the view's own row filter, so
  // no extra fetch is needed to resolve the parent's docStatus below.
  const { currentRecord } = useContext(RecordFilterValueDependenciesContext);

  const erpParentDocStatus = useAtomFamilySelectorValue(
    erpDocumentEffectiveDocStatusFamilySelector,
    {
      objectNameSingular: currentRecord?.objectMetadataNameSingular ?? '',
      recordId: currentRecord?.id ?? '',
    },
  );

  const isErpLineObject = isDefined(
    getErpDocumentParentNameSingularForLine(objectMetadataItem.nameSingular),
  );

  const handleCreateRecord = useCallback(
    async (recordInput?: Partial<ObjectRecord>) => {
      const createdRecord = await createNewIndexRecord({
        position: 'last',
        ...recordInput,
      });

      upsertRecordsInStore({ partialRecords: [createdRecord] });

      if (isDefined(totalNumberOfRecordsToVirtualize)) {
        loadRecordsToVirtualRows({
          records: [createdRecord],
          startingRealIndex: totalNumberOfRecordsToVirtualize,
        });
      }

      return createdRecord;
    },
    [
      createNewIndexRecord,
      upsertRecordsInStore,
      loadRecordsToVirtualRows,
      totalNumberOfRecordsToVirtualize,
    ],
  );

  // Focus lands in "Кол-во" right after an item-picker row is created, ready
  // for immediate keyboard entry (Dynamics BC pattern from Anton's UX
  // research) — mirrors what a real click on that cell does
  // (useOpenRecordTableCell), just computed for a record that didn't exist a
  // moment ago. totalNumberOfRecordsToVirtualize, read before creation, is
  // the new row's real index (mirrors the startingRealIndex passed to
  // loadRecordsToVirtualRows above).
  const focusQuantityCellOnCreatedRecord = useCallback(
    (createdRecord: ObjectRecord) => {
      if (!isDefined(totalNumberOfRecordsToVirtualize)) {
        return;
      }

      const quantityColumnIndex = visibleRecordFields.findIndex(
        (recordField) =>
          fieldDefinitionByFieldMetadataItemId[recordField.fieldMetadataItemId]
            ?.metadata.fieldName === QUANTITY_FIELD_NAME,
      );

      if (quantityColumnIndex < 0) {
        return;
      }

      const quantityFieldDefinition =
        fieldDefinitionByFieldMetadataItemId[
          visibleRecordFields[quantityColumnIndex].fieldMetadataItemId
        ];

      openTableCell({
        cellPosition: {
          row: totalNumberOfRecordsToVirtualize,
          column: quantityColumnIndex,
        },
        isReadOnly: false,
        fieldDefinition: quantityFieldDefinition,
        recordId: createdRecord.id,
        isNavigating: false,
      });
    },
    [
      totalNumberOfRecordsToVirtualize,
      visibleRecordFields,
      fieldDefinitionByFieldMetadataItemId,
      openTableCell,
    ],
  );

  // The picker only ever returns the picked item's id (RecordTableWidget
  // NestedRelationAddNewRow is generic infra) — the full item record
  // (name/price/vatRate) it needs for autofill is read straight back out of
  // Apollo's cache, already populated by the picker's own search query, no
  // extra network round trip.
  const handleItemSelected = useCallback(
    async (itemId: string) => {
      const itemRecord = getItemRecordFromCache(itemId);

      if (!isDefined(itemRecord)) {
        return;
      }

      const createdRecord = await handleCreateRecord(
        buildErpLineCreateInputFromItem({
          lineObjectMetadataItem: objectMetadataItem,
          itemRecord,
        }),
      );

      focusQuantityCellOnCreatedRecord(createdRecord);
    },
    [
      getItemRecordFromCache,
      handleCreateRecord,
      objectMetadataItem,
      focusQuantityCellOnCreatedRecord,
    ],
  );

  if (isRecordTableCellsNonEditable) {
    return null;
  }

  if (hasAnySoftDeleteFilterOnView) {
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

  // The whole "+ Строка" flow (plain row and item picker alike) must stay
  // inert on a POSTED/CANCELLED document: creating a line there is rejected
  // server-side ("Parent ... is POSTED; its lines cannot be modified" —
  // erp-document-line-guard.service.ts), but nothing client-side hid the row
  // before this — clicking it just failed with a console-only GraphQL error
  // (reproduced live against SI-000037). Same fail-open-on-unresolved-
  // docStatus stance as Task 2/3: hide only once a non-DRAFT status actually
  // resolves.
  if (
    isErpLineObject &&
    isErpDocumentFieldReadOnlyDueToDocStatus(erpParentDocStatus)
  ) {
    return null;
  }

  if (isDefined(erpLineItemPickerConfig)) {
    return (
      <RecordTableWidgetNestedRelationAddNewRow
        dropdownId={`${recordTableId}-nested-relation-add-new`}
        nestedRelationCreateThrough={erpLineItemPickerConfig}
        onRelationRecordSelected={handleItemSelected}
      />
    );
  }

  if (isDefined(nestedRelationCreateThrough)) {
    return (
      <RecordTableWidgetNestedRelationAddNewRow
        dropdownId={`${recordTableId}-nested-relation-add-new`}
        nestedRelationCreateThrough={nestedRelationCreateThrough}
        onRelationRecordSelected={(relationRecordId) =>
          handleCreateRecord({
            [nestedRelationCreateThrough.nestedRelationJoinColumnName]:
              relationRecordId,
          })
        }
      />
    );
  }

  return (
    <RecordTableActionRow
      onClick={() => handleCreateRecord()}
      LeftIcon={IconPlus}
      text={t`Add New`}
    />
  );
};
