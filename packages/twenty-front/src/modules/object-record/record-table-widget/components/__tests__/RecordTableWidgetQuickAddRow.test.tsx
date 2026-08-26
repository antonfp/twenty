import { render, screen } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { RecordTableWidgetQuickAddRow } from '@/object-record/record-table-widget/components/RecordTableWidgetQuickAddRow';
import { RecordIndexContextProvider } from '@/object-record/record-index/contexts/RecordIndexContext';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';

// Heavy data hooks swapped for no-op stubs — this test is only about the
// isRecordTableCellsNonEditable render gate (Finding 1 from the T6 review:
// quick-add must hide, same as "+ Строка", while the widget's own
// isReadOnly locks the table — e.g. page-layout edit mode).
jest.mock('@/object-record/hooks/useObjectPermissionsForObject', () => ({
  useObjectPermissionsForObject: () => ({
    objectMetadataId: 'sales-invoice-line',
    canReadObjectRecords: true,
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: true,
    canDestroyObjectRecords: true,
    restrictedFields: {},
  }),
}));
jest.mock('@/object-record/select/hooks/useRecordsForSelect', () => ({
  useRecordsForSelect: () => ({
    recordsToSelect: [],
    selectedRecords: [],
    filteredSelectedRecords: [],
    loading: false,
  }),
}));
jest.mock('@/object-record/hooks/useLazyFindManyRecords', () => ({
  useLazyFindManyRecords: () => ({
    findManyRecordsLazy: jest.fn(),
    fetchMoreRecordsLazy: jest.fn(),
    queryIdentifier: 'query-id',
  }),
}));
jest.mock('@/object-record/record-table/hooks/useCreateNewIndexRecord', () => ({
  useCreateNewIndexRecord: () => ({ createNewIndexRecord: jest.fn() }),
}));
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: jest.fn() }),
}));
jest.mock('@/object-record/cache/hooks/useGetRecordFromCache', () => ({
  useGetRecordFromCache: () => jest.fn(),
}));
// Only used here for the soft-delete-filter-on-view gate — pinned to "not
// blocking" so the test isolates the isRecordTableCellsNonEditable gate.
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({
    useAtomComponentSelectorValue: () => false,
  }),
);
// Only used here for the docStatus gate — pinned to undefined (fail-open,
// matches an unresolved parent document) for the same isolation reason.
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({
    useAtomFamilySelectorValue: () => undefined,
  }),
);

const RECORD_INDEX_ID = 'record-index';

const salesInvoiceLineObjectMetadataItem = {
  id: 'sales-invoice-line',
  nameSingular: 'salesInvoiceLine',
  namePlural: 'salesInvoiceLines',
  isUICreatable: true,
  isUIEditable: true,
  isRemote: false,
  isSystem: false,
  applicationId: undefined,
  fields: [
    { name: 'quantity' },
    { name: 'price' },
    { name: 'amount' },
    { name: 'vatRate' },
  ],
} as unknown as EnrichedObjectMetadataItem;

const renderQuickAddRow = ({
  isRecordTableCellsNonEditable,
}: {
  isRecordTableCellsNonEditable: boolean;
}) => {
  const store = createStore();

  store.set(
    isRecordTableCellsNonEditableComponentState.atomFamily({
      instanceId: RECORD_INDEX_ID,
    }),
    isRecordTableCellsNonEditable,
  );

  return render(
    <JotaiProvider store={store}>
      <RecordIndexContextProvider
        value={{
          indexIdentifierUrl: () => '',
          onIndexRecordsLoaded: () => {},
          objectNamePlural: 'salesInvoiceLines',
          objectNameSingular: 'salesInvoiceLine',
          objectMetadataItem: salesInvoiceLineObjectMetadataItem,
          objectPermissionsByObjectMetadataId: {},
          recordIndexId: RECORD_INDEX_ID,
          viewBarInstanceId: 'view-bar',
          recordFieldByFieldMetadataItemId: {},
          labelIdentifierFieldMetadataItem: undefined,
          fieldMetadataItemByFieldMetadataItemId: {},
          fieldDefinitionByFieldMetadataItemId: {},
        }}
      >
        <RecordTableWidgetQuickAddRow />
      </RecordIndexContextProvider>
    </JotaiProvider>,
  );
};

describe('RecordTableWidgetQuickAddRow', () => {
  it('renders the quick-add input when the table is editable', () => {
    renderQuickAddRow({ isRecordTableCellsNonEditable: false });

    expect(
      screen.getByPlaceholderText(
        'Добавить позицию: название, код или артикул…',
      ),
    ).toBeInTheDocument();
  });

  // Finding 1 (T6 review, Major): the widget's own isReadOnly (e.g.
  // page-layout edit mode via FieldWidgetRelationTable) sets this same atom
  // that "+ Строка" already gates on — quick-add must hide too, not keep
  // firing live create/increment mutations while the rest of the table is
  // locked for editing.
  it('hides the quick-add input when the table is read-only', () => {
    renderQuickAddRow({ isRecordTableCellsNonEditable: true });

    expect(
      screen.queryByPlaceholderText(
        'Добавить позицию: название, код или артикул…',
      ),
    ).not.toBeInTheDocument();
  });
});
