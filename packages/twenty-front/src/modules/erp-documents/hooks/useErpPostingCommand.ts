import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { dispatchObjectRecordOperationBrowserEvent } from '@/browser-event/utils/dispatchObjectRecordOperationBrowserEvent';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import {
  CANCEL_ERP_DOCUMENT,
  POST_ERP_DOCUMENT,
} from '@/erp-documents/graphql/mutations/erpPostingMutations';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';

export const useErpPostingCommand = (kind: 'post' | 'cancel') => {
  const { objectMetadataItem, selectedRecords } =
    useHeadlessCommandContextApi();

  if (!isDefined(objectMetadataItem)) {
    throw new Error(
      'Object metadata item is required to run an ERP posting command',
    );
  }

  const objectNameSingular = objectMetadataItem.nameSingular;

  const apolloCoreClient = useApolloCoreClient();
  const { enqueueSuccessSnackBar } = useSnackBar();
  const { findOneRecord } = useLazyFindOneRecord({
    objectNameSingular,
    fetchPolicy: 'network-only',
  });

  const execute = async () => {
    const selectedRecord = selectedRecords[0];

    if (!isDefined(selectedRecord)) {
      return;
    }

    // Errors propagate to HeadlessEngineCommandWrapperEffect, which surfaces
    // the server's message through the error snackbar.
    await apolloCoreClient.mutate({
      mutation: kind === 'post' ? POST_ERP_DOCUMENT : CANCEL_ERP_DOCUMENT,
      variables: {
        objectNameSingular,
        recordId: selectedRecord.id,
      },
    });

    // Refresh the posted fields (docStatus, number, totals) everywhere: the
    // network-only findOne updates the Apollo cache the show page watches,
    // the browser event refreshes index tables/boards.
    await findOneRecord({ objectRecordId: selectedRecord.id });

    dispatchObjectRecordOperationBrowserEvent({
      objectMetadataItem,
      operation: {
        type: 'update-one',
        result: {
          updateInput: { recordId: selectedRecord.id, updatedFields: [] },
        },
      },
    });

    enqueueSuccessSnackBar({
      message: kind === 'post' ? t`Документ проведён` : t`Проведение отменено`,
    });
  };

  return { execute };
};
