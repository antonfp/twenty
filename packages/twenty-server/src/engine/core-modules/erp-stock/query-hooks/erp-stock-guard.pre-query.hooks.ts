import { type Type } from '@nestjs/common';

import { msg } from '@lingui/core/macro';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';

import {
  createErpDocumentGuardHook,
  createErpDocumentLineGuardHook,
  createErpRegisterGuardHook,
  ERP_DOCUMENT_GUARD_OPERATIONS,
} from 'src/engine/core-modules/erp-sales/query-hooks/erp-sales-guard.pre-query.hooks';

// Guard wiring is reused from erp-sales (object-agnostic factories); only
// the object lists are stock-specific.
const ERP_STOCK_DOCUMENT_OBJECT_NAMES = [
  'goodsReceipt',
  'salesShipment',
  'stockTransfer',
  'goodsWriteOff',
  'goodsPosting',
] as const;

const ERP_STOCK_LINE_OBJECTS: readonly {
  lineObjectNameSingular: string;
  parentFieldName: string;
  parentObjectNameSingular: string;
}[] = ERP_STOCK_DOCUMENT_OBJECT_NAMES.map((objectNameSingular) => ({
  lineObjectNameSingular: `${objectNameSingular}Line`,
  parentFieldName: `${objectNameSingular}Id`,
  parentObjectNameSingular: objectNameSingular,
}));

const ERP_STOCK_REGISTER_OBJECTS = [
  {
    registerObjectNameSingular: 'stockLedgerEntry',
    userFriendlyMessage: msg`Регистр движений товаров формируется автоматически при проведении документов — ручные изменения запрещены.`,
  },
  {
    registerObjectNameSingular: 'itemBalance',
    userFriendlyMessage: msg`Остатки товаров обновляются автоматически при проведении документов — ручные изменения запрещены.`,
  },
] as const;

export const ERP_STOCK_GUARD_HOOKS: Type<WorkspacePreQueryHookInstance>[] = [
  ...ERP_STOCK_DOCUMENT_OBJECT_NAMES.flatMap((objectNameSingular) =>
    ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentGuardHook(objectNameSingular, operation),
    ),
  ),
  ...ERP_STOCK_LINE_OBJECTS.flatMap(
    ({ lineObjectNameSingular, parentFieldName, parentObjectNameSingular }) =>
      ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
        createErpDocumentLineGuardHook(
          lineObjectNameSingular,
          parentFieldName,
          parentObjectNameSingular,
          operation,
        ),
      ),
  ),
  ...ERP_STOCK_REGISTER_OBJECTS.flatMap(
    ({ registerObjectNameSingular, userFriendlyMessage }) =>
      ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
        createErpRegisterGuardHook(
          registerObjectNameSingular,
          operation,
          userFriendlyMessage,
        ),
      ),
  ),
];
