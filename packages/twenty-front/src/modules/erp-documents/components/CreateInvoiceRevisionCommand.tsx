import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { AppPath } from 'twenty-shared/types';

import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { CREATE_INVOICE_REVISION } from '@/erp-documents/graphql/mutations/createInvoiceRevisionMutation';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useNavigateApp } from '~/hooks/useNavigateApp';

export const CreateInvoiceRevisionCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const apolloCoreClient = useApolloCoreClient();
  const { enqueueSuccessSnackBar } = useSnackBar();
  const navigateApp = useNavigateApp();

  const execute = async () => {
    const selectedRecord = selectedRecords[0];

    if (!isDefined(selectedRecord)) {
      return;
    }

    // Errors propagate to HeadlessEngineCommandWrapperEffect, which surfaces
    // the server's RU refusal (DRAFT/CANCELLED source, existing draft
    // revision) through the error snackbar — same contract as
    // useErpPostingCommand's post/cancel mutations.
    const { data } = await apolloCoreClient.mutate<{
      createInvoiceRevision: string;
    }>({
      mutation: CREATE_INVOICE_REVISION,
      variables: { recordId: selectedRecord.id },
    });

    const newInvoiceId = data?.createInvoiceRevision;

    if (!isDefined(newInvoiceId)) {
      return;
    }

    // Подсказка бухгалтеру (ruling): оригинал не отменяется автоматически —
    // это решение принимает бухгалтер отдельно, когда исправление готово.
    enqueueSuccessSnackBar({
      message: t`Исправление создано (черновик). Оригинал остаётся проведённым — отмените его проведение, когда исправление готово.`,
    });

    navigateApp(AppPath.RecordShowPage, {
      objectNameSingular: 'salesInvoice',
      objectRecordId: newInvoiceId,
    });
  };

  return <HeadlessEngineCommandWrapperEffect execute={execute} />;
};
