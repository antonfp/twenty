import {
  computeErpLineTabConveyorTarget,
  getErpLineItemPickerConfig,
} from '@/erp-documents/utils/erpLineSmartGrid';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { recordIndexAllRecordIdsComponentSelector } from '@/object-record/record-index/states/selectors/recordIndexAllRecordIdsComponentSelector';
import { RecordTableBodyContextProvider } from '@/object-record/record-table/contexts/RecordTableBodyContext';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useRecordTableMoveFocusedCell } from '@/object-record/record-table/hooks/useRecordTableMoveFocusedCell';
import { useCloseRecordTableCellNoGroup } from '@/object-record/record-table/record-table-cell/hooks/internal/useCloseRecordTableCellNoGroup';
import { useMoveHoverToCurrentCell } from '@/object-record/record-table/record-table-cell/hooks/useMoveHoverToCurrentCell';
import {
  type OpenTableCellArgs,
  useOpenRecordTableCell,
} from '@/object-record/record-table/record-table-cell/hooks/useOpenRecordTableCell';
import { useTriggerCommandMenuDropdown } from '@/object-record/record-table/record-table-cell/hooks/useTriggerCommandMenuDropdown';
import { hasUserSelectedAllRowsComponentState } from '@/object-record/record-table/record-table-row/states/hasUserSelectedAllRowsFamilyState';
import { recordTableFocusPositionComponentState } from '@/object-record/record-table/states/recordTableFocusPositionComponentState';
import { type MoveFocusDirection } from '@/object-record/record-table/types/MoveFocusDirection';
import { type TableCellPosition } from '@/object-record/record-table/types/TableCellPosition';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { type ReactNode, useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

type RecordTableNoRecordGroupBodyContextProviderProps = {
  children?: ReactNode;
};

export const RecordTableNoRecordGroupBodyContextProvider = ({
  children,
}: RecordTableNoRecordGroupBodyContextProviderProps) => {
  const { recordTableId, objectMetadataItem, visibleRecordFields } =
    useRecordTableContextOrThrow();
  const { fieldDefinitionByFieldMetadataItemId } =
    useRecordIndexContextOrThrow();

  const { openTableCell } = useOpenRecordTableCell(recordTableId);

  const handleOpenTableCell = (args: OpenTableCellArgs) => {
    openTableCell(args);
  };

  const { moveFocus } = useRecordTableMoveFocusedCell(recordTableId);

  const { openDropdown } = useOpenDropdown();

  const erpLineItemPickerConfig = useMemo(
    () => getErpLineItemPickerConfig(objectMetadataItem),
    [objectMetadataItem],
  );

  const recordTableFocusPosition = useAtomComponentStateValue(
    recordTableFocusPositionComponentState,
    recordTableId,
  );

  const allRecordIds = useAtomComponentSelectorValue(
    recordIndexAllRecordIdsComponentSelector,
    recordTableId,
  );

  // Tab-конвейер (Task 5): platform Tab (RecordTableCellFieldInput.handleTab)
  // commits the cell, closes it, then calls onMoveFocus('right') — but
  // moveRight (useRecordTableMoveFocusedCell) only updates the internal
  // focus-position atom, it never reopens edit mode on the new cell, so
  // keyboard focus is lost to <body> after every Tab (platform-wide gap,
  // documented in the task report, not fixed generally here — a real fix
  // needs a Tab-specific "move AND reopen" path distinct from arrow-key
  // moves, which must NOT auto-open edit mode; that is a bigger, riskier,
  // cross-cutting change). This makes the conveyor work independently,
  // scoped to ERP line objects with an item picker: last column → open the
  // "+ Строка" picker for the next row; any other column → reopen edit mode
  // on the next cell so Tab still works across the row.
  const handleMoveFocus = (direction: MoveFocusDirection) => {
    if (direction === 'right') {
      const conveyorTarget = computeErpLineTabConveyorTarget({
        isEligible: isDefined(erpLineItemPickerConfig),
        focusPosition: recordTableFocusPosition,
        numberOfColumns: visibleRecordFields.length,
      });

      if (conveyorTarget.type === 'openItemPicker') {
        openDropdown({
          dropdownComponentInstanceIdFromProps: `${recordTableId}-nested-relation-add-new`,
        });
        return;
      }

      if (conveyorTarget.type === 'openCell') {
        const recordId = allRecordIds[recordTableFocusPosition?.row ?? -1];
        const nextRecordField = visibleRecordFields[conveyorTarget.column];
        const nextFieldDefinition = isDefined(nextRecordField)
          ? fieldDefinitionByFieldMetadataItemId[
              nextRecordField.fieldMetadataItemId
            ]
          : undefined;

        if (isDefined(recordId) && isDefined(nextFieldDefinition)) {
          openTableCell({
            cellPosition: {
              row: recordTableFocusPosition?.row ?? 0,
              column: conveyorTarget.column,
            },
            isReadOnly: false,
            fieldDefinition: nextFieldDefinition,
            recordId,
            isNavigating: false,
          });
          return;
        }
      }
    }

    moveFocus(direction);
  };

  const { closeTableCellNoGroup } = useCloseRecordTableCellNoGroup();

  const handleCloseTableCell = () => {
    closeTableCellNoGroup();
  };

  const { moveHoverToCurrentCell } = useMoveHoverToCurrentCell(recordTableId);

  const handleMoveHoverToCurrentCell = (cellPosition: TableCellPosition) => {
    moveHoverToCurrentCell(cellPosition);
  };

  const { triggerCommandMenuDropdown } = useTriggerCommandMenuDropdown({
    recordTableId,
  });

  const handleCommandMenuDropdown = (
    event: React.MouseEvent,
    recordId: string,
  ) => {
    triggerCommandMenuDropdown(event, recordId);
  };

  const hasUserSelectedAllRows = useAtomComponentStateValue(
    hasUserSelectedAllRowsComponentState,
    recordTableId,
  );

  return (
    <RecordTableBodyContextProvider
      value={{
        onOpenTableCell: handleOpenTableCell,
        onMoveFocus: handleMoveFocus,
        onCloseTableCell: handleCloseTableCell,
        onMoveHoverToCurrentCell: handleMoveHoverToCurrentCell,
        onCommandMenuDropdownOpened: handleCommandMenuDropdown,
        hasUserSelectedAllRows,
      }}
    >
      {children}
    </RecordTableBodyContextProvider>
  );
};
