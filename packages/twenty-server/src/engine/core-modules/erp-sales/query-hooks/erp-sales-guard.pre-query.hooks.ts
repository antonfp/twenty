import { type Type } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { assertIsDefinedOrThrow } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type ResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  CommonQueryRunnerException,
  CommonQueryRunnerExceptionCode,
} from 'src/engine/api/common/common-query-runners/errors/common-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import {
  type ErpDocumentGuardOperation,
  ErpDocumentGuardService,
} from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';

const ERP_DOCUMENT_OBJECT_NAMES = ['salesInvoice', 'payment'] as const;

const ERP_DOCUMENT_GUARD_OPERATIONS: readonly ErpDocumentGuardOperation[] = [
  'createOne',
  'createMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'destroyOne',
  'destroyMany',
  'restoreOne',
  'restoreMany',
  'mergeMany',
];

const SALES_INVOICE_LINE_OBJECT_NAME = 'salesInvoiceLine';
const SALES_INVOICE_LINE_PARENT_FIELD_NAME = 'salesInvoiceId';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';

const PARTY_LEDGER_ENTRY_OBJECT_NAME = 'partyLedgerEntry';

const ERP_REGISTER_GUARD_OPERATIONS = [
  'createOne',
  'createMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'destroyOne',
  'destroyMany',
  'restoreOne',
  'restoreMany',
  'mergeMany',
] as const;

// One decorated class per (object, operation) hook key: the query-hook
// storage holds a single key per class, so hooks cannot be merged further.
const createErpDocumentGuardHook = (
  objectNameSingular: (typeof ERP_DOCUMENT_OBJECT_NAMES)[number],
  operation: ErpDocumentGuardOperation,
): Type<WorkspacePreQueryHookInstance> => {
  @WorkspaceQueryHook(`${objectNameSingular}.${operation}`)
  class ErpDocumentGuardPreQueryHook implements WorkspacePreQueryHookInstance {
    constructor(
      private readonly erpDocumentGuardService: ErpDocumentGuardService,
    ) {}

    async execute(
      authContext: WorkspaceAuthContext,
      _objectName: string,
      payload: ResolverArgs,
    ): Promise<ResolverArgs> {
      const workspace = authContext.workspace;

      assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

      await this.erpDocumentGuardService.assertDocumentMutationAllowed({
        workspaceId: workspace.id,
        objectNameSingular,
        operation,
        payload,
      });

      return payload;
    }
  }

  return ErpDocumentGuardPreQueryHook;
};

// One decorated class per (lineObject, operation) hook key, mirroring
// createErpDocumentGuardHook above — the shared check itself lives in
// ErpDocumentLineGuardService so it isn't duplicated per document type.
const createErpDocumentLineGuardHook = (
  lineObjectNameSingular: string,
  parentFieldName: string,
  parentObjectNameSingular: string,
  operation: ErpDocumentGuardOperation,
): Type<WorkspacePreQueryHookInstance> => {
  @WorkspaceQueryHook(`${lineObjectNameSingular}.${operation}`)
  class ErpDocumentLineGuardPreQueryHook implements WorkspacePreQueryHookInstance {
    constructor(
      private readonly erpDocumentLineGuardService: ErpDocumentLineGuardService,
    ) {}

    async execute(
      authContext: WorkspaceAuthContext,
      _objectName: string,
      payload: ResolverArgs,
    ): Promise<ResolverArgs> {
      const workspace = authContext.workspace;

      assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

      await this.erpDocumentLineGuardService.assertLineMutationAllowed({
        workspaceId: workspace.id,
        lineObjectNameSingular,
        parentFieldName,
        parentObjectNameSingular,
        operation,
        payload,
      });

      return payload;
    }
  }

  return ErpDocumentLineGuardPreQueryHook;
};

const createErpRegisterGuardHook = (
  operation: (typeof ERP_REGISTER_GUARD_OPERATIONS)[number],
): Type<WorkspacePreQueryHookInstance> => {
  @WorkspaceQueryHook(`${PARTY_LEDGER_ENTRY_OBJECT_NAME}.${operation}`)
  class ErpRegisterGuardPreQueryHook implements WorkspacePreQueryHookInstance {
    async execute(): Promise<ResolverArgs> {
      // Registers are written only by PostingService inside the posting
      // transaction; every external write path is blocked unconditionally.
      throw new CommonQueryRunnerException(
        `Register "${PARTY_LEDGER_ENTRY_OBJECT_NAME}" is server-written only`,
        CommonQueryRunnerExceptionCode.BAD_REQUEST,
        {
          userFriendlyMessage: msg`Регистр взаиморасчётов формируется автоматически при проведении документов — ручные изменения запрещены.`,
        },
      );
    }
  }

  return ErpRegisterGuardPreQueryHook;
};

export const ERP_SALES_GUARD_HOOKS: Type<WorkspacePreQueryHookInstance>[] = [
  ...ERP_DOCUMENT_OBJECT_NAMES.flatMap((objectNameSingular) =>
    ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentGuardHook(objectNameSingular, operation),
    ),
  ),
  ...ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
    createErpDocumentLineGuardHook(
      SALES_INVOICE_LINE_OBJECT_NAME,
      SALES_INVOICE_LINE_PARENT_FIELD_NAME,
      SALES_INVOICE_OBJECT_NAME,
      operation,
    ),
  ),
  ...ERP_REGISTER_GUARD_OPERATIONS.map((operation) =>
    createErpRegisterGuardHook(operation),
  ),
];
