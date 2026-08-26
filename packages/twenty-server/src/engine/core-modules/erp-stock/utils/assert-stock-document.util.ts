import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';

// Shared per-line validation for all five stock documents: at least one line,
// positive quantity, an item on every line (a movement without an item cannot
// be tracked in balances), optionally a non-negative price.
export const assertStockDocumentLines = (
  document: ErpDocumentRecord,
  lines: ErpDocumentLineRecord[],
  { requirePrice }: { requirePrice: boolean },
): void => {
  if (lines.length === 0) {
    throw new ErpPostingException(
      `Document "${document.id}" has no lines`,
      ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
      {
        userFriendlyMessage: msg`Документ нельзя провести без строк: добавьте хотя бы одну позицию.`,
      },
    );
  }

  for (const line of lines) {
    const quantity = Number(line.quantity ?? 0);

    if (!(quantity > 0)) {
      throw new ErpPostingException(
        `Line "${line.id}" has non-positive quantity`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Количество в каждой строке должно быть больше нуля.`,
        },
      );
    }

    if (typeof line.itemId !== 'string' || line.itemId.length === 0) {
      throw new ErpPostingException(
        `Line "${line.id}" has no item`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`В каждой строке должен быть указан товар.`,
        },
      );
    }

    if (
      requirePrice &&
      currencyToKopecks(line.price as CurrencyFieldValue) < 0
    ) {
      throw new ErpPostingException(
        `Line "${line.id}" has negative price`,
        ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
        {
          userFriendlyMessage: msg`Цена в строке не может быть отрицательной.`,
        },
      );
    }
  }
};

export const assertWarehouseAssigned = (
  document: ErpDocumentRecord,
  warehouseFieldName: string = 'warehouseId',
): string => {
  const warehouseId = document[warehouseFieldName];

  if (typeof warehouseId !== 'string' || warehouseId.length === 0) {
    throw new ErpPostingException(
      `Document "${document.id}" has no "${warehouseFieldName}"`,
      ERP_POSTING_EXCEPTION_CODE.POSTING_FAILED,
      {
        userFriendlyMessage: msg`Укажите склад в документе.`,
      },
    );
  }

  return warehouseId;
};

export const resolveLinesCurrencyCode = (
  lines: ErpDocumentLineRecord[],
  currencyFieldName: string = 'price',
): string => {
  for (const line of lines) {
    const currencyCode = (line[currencyFieldName] as CurrencyFieldValue)
      ?.currencyCode;

    if (isNonEmptyString(currencyCode)) {
      return currencyCode;
    }
  }

  return RUB_CURRENCY_CODE;
};
