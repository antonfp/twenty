import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { OpenRecordIn } from 'twenty-shared/types';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';

jest.mock('uuid', () => ({
  ...jest.requireActual('uuid'),
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

const mockCreateOneRecord = jest.fn().mockResolvedValue({ id: 'mocked-uuid' });
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));

const mockOpenRecordInSidePanel = jest.fn();
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({
    openRecordInSidePanel: mockOpenRecordInSidePanel,
  }),
}));

// Always SIDE_PANEL: makes `openRecordInSidePanel` the single observable for
// "did the platform's default open-a-new-record behavior run" — this test is
// about the isErpLineObject gate around that behavior, not about resolving
// which of side-panel/navigate the platform would otherwise pick.
jest.mock('@/object-record/record-index/hooks/useResolveOpenRecordIn', () => ({
  useResolveOpenRecordIn: () => OpenRecordIn.SIDE_PANEL,
}));

jest.mock('@/side-panel/hooks/useSidePanelMenu', () => ({
  useSidePanelMenu: () => ({ closeSidePanelMenu: jest.fn() }),
}));

jest.mock('@/object-record/record-store/hooks/useUpsertRecordsInStore', () => ({
  useUpsertRecordsInStore: () => ({ upsertRecordsInStore: jest.fn() }),
}));

jest.mock(
  '@/object-record/record-table/hooks/useBuildRecordInputFromFilters',
  () => ({
    useBuildRecordInputFromFilters: () => ({
      buildRecordInputFromFilters: () => ({}),
    }),
  }),
);

const mockNavigateApp = jest.fn();
jest.mock('~/hooks/useNavigateApp', () => ({
  useNavigateApp: () => mockNavigateApp,
}));

// Component-instance state plumbing needs a live component context this test
// doesn't set up — not exercised by the isErpLineObject gate either way
// (recordIndexGroupFieldMetadataItem stays undefined, so the record-group
// branch is skipped, and no-panel/no-navigate never touches the jotai store).
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue',
  () => ({
    useAtomComponentSelectorValue: () => [],
  }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue',
  () => ({
    useAtomComponentStateValue: () => undefined,
  }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateCallbackState',
  () => ({
    useAtomComponentFamilyStateCallbackState: () => jest.fn(),
  }),
);
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useStore: () => ({ get: jest.fn(), set: jest.fn() }),
}));

const personMockObjectMetadataItem =
  getTestEnrichedObjectMetadataItemsMock().find(
    (item) => item.nameSingular === 'person',
  )!;

const salesInvoiceLineMockObjectMetadataItem: EnrichedObjectMetadataItem = {
  ...personMockObjectMetadataItem,
  nameSingular: 'salesInvoiceLine',
};

describe('useCreateNewIndexRecord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not open a side panel when creating a row on an ERP line object', async () => {
    const { result } = renderHook(() =>
      useCreateNewIndexRecord({
        objectMetadataItem: salesInvoiceLineMockObjectMetadataItem,
      }),
    );

    await act(async () => {
      await result.current.createNewIndexRecord();
    });

    expect(mockCreateOneRecord).toHaveBeenCalled();
    expect(mockOpenRecordInSidePanel).not.toHaveBeenCalled();
    expect(mockNavigateApp).not.toHaveBeenCalled();
  });

  it('still opens a side panel when creating a row on a non-ERP object', async () => {
    const { result } = renderHook(() =>
      useCreateNewIndexRecord({
        objectMetadataItem: personMockObjectMetadataItem,
      }),
    );

    await act(async () => {
      await result.current.createNewIndexRecord();
    });

    expect(mockCreateOneRecord).toHaveBeenCalled();
    expect(mockOpenRecordInSidePanel).toHaveBeenCalledWith({
      recordId: 'mocked-uuid',
      objectNameSingular: 'person',
      isNewRecord: true,
    });
  });
});
