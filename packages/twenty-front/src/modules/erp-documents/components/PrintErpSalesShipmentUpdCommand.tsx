import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { isCookieAuthActiveState } from '@/auth/states/isCookieAuthActiveState';
import { tokenPairState } from '@/auth/states/tokenPairState';
import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { REACT_APP_SERVER_BASE_URL } from '~/config';

type RestErrorBody = {
  messages?: string[];
  message?: string;
  error?: string;
};

const extractRestErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as RestErrorBody;
    const message = body.messages?.[0] ?? body.message ?? body.error;

    if (isNonEmptyString(message)) {
      return message;
    }
  } catch {
    // Non-JSON error body, fall through to the HTTP status.
  }

  return `${response.status} ${response.statusText}`;
};

export const PrintErpSalesShipmentUpdCommand = () => {
  const { selectedRecords } = useHeadlessCommandContextApi();
  const tokenPair = useAtomStateValue(tokenPairState);
  const isCookieAuthActive = useAtomStateValue(isCookieAuthActiveState);
  const { enqueueErrorSnackBar } = useSnackBar();

  const execute = async () => {
    const selectedRecord = selectedRecords[0];

    if (!isDefined(selectedRecord)) {
      return;
    }

    // Opened before the fetch, while the click's user activation is still
    // valid for popups; the HTML is written into it once the fetch returns.
    const printWindow = window.open('about:blank', '_blank');

    if (!isDefined(printWindow)) {
      enqueueErrorSnackBar({
        message: t`Разрешите всплывающие окна, чтобы открыть печатную форму`,
      });

      return;
    }

    try {
      const token = tokenPair?.accessOrWorkspaceAgnosticToken.token;

      // Mirrors the Apollo auth link: with cookie auth active the session
      // cookie authenticates and a Bearer header must not be sent (it takes
      // precedence server-side and may be stale).
      const shouldSendBearerToken =
        !isCookieAuthActive && isNonEmptyString(token);

      const response = await fetch(
        // Status omitted: server defaults to «2» (УПД as a transfer
        // document, no separate счёт-фактура contour in the MVP).
        `${REACT_APP_SERVER_BASE_URL}/rest/erp/sales-shipments/${selectedRecord.id}/print-upd`,
        {
          credentials: 'include',
          headers: shouldSendBearerToken
            ? { Authorization: `Bearer ${token}` }
            : {},
        },
      );

      if (!response.ok) {
        throw new Error(await extractRestErrorMessage(response));
      }

      const html = await response.text();

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      printWindow.close();

      enqueueErrorSnackBar({
        message:
          error instanceof Error && isNonEmptyString(error.message)
            ? error.message
            : t`Не удалось открыть печатную форму`,
      });
    }
  };

  return <HeadlessEngineCommandWrapperEffect execute={execute} />;
};
