import { render, screen } from '@testing-library/react';
import { useContext } from 'react';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { RecordBoardCardBody } from '@/object-record/record-board/record-board-card/components/RecordBoardCardBody';
import { RecordBoardCardContext } from '@/object-record/record-board/record-board-card/contexts/RecordBoardCardContext';
import { RecordBoardContext } from '@/object-record/record-board/contexts/RecordBoardContext';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { RecordIndexContextProvider } from '@/object-record/record-index/contexts/RecordIndexContext';
import { FieldMetadataType } from '~/generated-metadata/graphql';

const mockUseIsRecordFieldReadOnlyDueToErpDocStatus = jest.fn();

jest.mock(
  '@/object-record/read-only/hooks/useIsRecordFieldReadOnlyDueToErpDocStatus',
  () => ({
    useIsRecordFieldReadOnlyDueToErpDocStatus: (...args: unknown[]) =>
      mockUseIsRecordFieldReadOnlyDueToErpDocStatus(...args),
  }),
);
jest.mock(
  '@/object-metadata/hooks/useGetIsMetadataItemFromStandardApplication',
  () => ({
    useGetIsMetadataItemFromStandardApplication: () => () => false,
  }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({
    useAtomComponentSelectorValue: () => [
      {
        id: 'field-1',
        fieldMetadataItemId: 'field-1',
        position: 0,
        isVisible: true,
        size: 100,
      },
    ],
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomComponentState', () => ({
  useSetAtomComponentState: () => jest.fn(),
}));
// Real RecordInlineCell pulls in the whole field-rendering + Apollo graph;
// swapped for a probe that surfaces the one thing under test here.
jest.mock(
  '@/object-record/record-inline-cell/components/RecordInlineCell',
  () => ({
    RecordInlineCell: () => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { isRecordFieldReadOnly } = useContext(FieldContext);

      return (
        <div data-testid="read-only-probe">{String(isRecordFieldReadOnly)}</div>
      );
    },
  }),
);

const fieldDefinition = {
  type: FieldMetadataType.TEXT,
  fieldMetadataId: 'field-1',
  label: 'Name',
  iconName: 'IconAbc',
  metadata: {
    fieldName: 'name',
    isUIEditable: true,
    applicationId: undefined,
  },
};

const renderBoardCardBody = () =>
  render(
    <RecordIndexContextProvider
      value={{
        indexIdentifierUrl: () => '',
        onIndexRecordsLoaded: () => {},
        objectNamePlural: 'salesInvoices',
        objectNameSingular: 'salesInvoice',
        objectMetadataItem: {} as EnrichedObjectMetadataItem,
        objectPermissionsByObjectMetadataId: {},
        recordIndexId: 'record-index',
        viewBarInstanceId: 'view-bar',
        recordFieldByFieldMetadataItemId: {},
        labelIdentifierFieldMetadataItem: undefined,
        fieldMetadataItemByFieldMetadataItemId: {},
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fieldDefinitionByFieldMetadataItemId: {
          'field-1': fieldDefinition as any,
        },
      }}
    >
      <RecordBoardContext.Provider
        value={{
          objectMetadataItem: {
            nameSingular: 'salesInvoice',
            isSystem: false,
          } as EnrichedObjectMetadataItem,
          selectFieldMetadataItem: {} as never,
          createOneRecord: jest.fn(),
          updateOneRecord: jest.fn(),
          deleteOneRecord: jest.fn(),
          recordBoardId: 'board-id',
          objectPermissions: {
            canReadObjectRecords: true,
            canUpdateObjectRecords: true,
            restrictedFields: {},
          } as never,
        }}
      >
        <RecordBoardCardContext.Provider
          value={{
            recordId: 'record-1',
            isRecordReadOnly: false,
            rowIndex: 0,
            columnIndex: 0,
          }}
        >
          <RecordBoardCardBody />
        </RecordBoardCardContext.Provider>
      </RecordBoardContext.Provider>
    </RecordIndexContextProvider>,
  );

describe('RecordBoardCardBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cell editable when the ERP docStatus check reports editable', () => {
    mockUseIsRecordFieldReadOnlyDueToErpDocStatus.mockReturnValue(false);

    renderBoardCardBody();

    expect(screen.getByTestId('read-only-probe')).toHaveTextContent('false');
  });

  it('renders the cell read-only when the ERP docStatus check reports read-only (POSTED/CANCELLED document)', () => {
    mockUseIsRecordFieldReadOnlyDueToErpDocStatus.mockReturnValue(true);

    renderBoardCardBody();

    expect(screen.getByTestId('read-only-probe')).toHaveTextContent('true');
    expect(mockUseIsRecordFieldReadOnlyDueToErpDocStatus).toHaveBeenCalledWith({
      objectNameSingular: 'salesInvoice',
      recordId: 'record-1',
    });
  });
});
