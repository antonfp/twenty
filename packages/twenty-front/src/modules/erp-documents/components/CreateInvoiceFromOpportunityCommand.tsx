import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { AppPath } from 'twenty-shared/types';

import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { CREATE_INVOICE_FROM_OPPORTUNITY } from '@/erp-documents/graphql/mutations/createInvoiceFromOpportunityMutation';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useNavigateApp } from '~/hooks/useNavigateApp';

export const CreateInvoiceFromOpportunityCommand = () => {
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
    // the server's RU refusal (no company on the deal, no organization) —
    // same contract as CreateInvoiceRevisionCommand.
    const { data } = await apolloCoreClient.mutate<{
      createInvoiceFromOpportunity: string;
    }>({
      mutation: CREATE_INVOICE_FROM_OPPORTUNITY,
      variables: { opportunityId: selectedRecord.id },
    });

    const invoiceId = data?.createInvoiceFromOpportunity;

    if (!isDefined(invoiceId)) {
      return;
    }

    // Covers both outcomes (new draft vs an already-open one reused) — the
    // server's idempotency, ruling «glue Сделка→Счёт»: same wording works
    // either way.
    enqueueSuccessSnackBar({
      message: t`Счёт по сделке готов (черновик).`,
    });

    navigateApp(AppPath.RecordShowPage, {
      objectNameSingular: 'salesInvoice',
      objectRecordId: invoiceId,
    });
  };

  return <HeadlessEngineCommandWrapperEffect execute={execute} />;
};
