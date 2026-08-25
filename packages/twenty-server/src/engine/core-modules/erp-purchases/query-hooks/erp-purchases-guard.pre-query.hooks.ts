import { type Type } from '@nestjs/common';

import { assertIsDefinedOrThrow } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type ResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import {
  type ErpDocumentGuardOperation,
  ErpDocumentGuardService,
} from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';

// Register (partyLedgerEntry) mutation hooks already exist on the sales
// module and apply workspace-wide by object.operation key — duplicating them
// here would double-register the same hook key.
const ERP_DOCUMENT_OBJECT_NAMES = [
  'supplierInvoice',
  'supplierPayment',
] as const;

const ERP_DOCUMENT_GUARD_OPERATIONS: readonly ErpDocumentGuardOperation[] = [
  'createOne',
  'createMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'destroyOne',
  'destroyMany',
];

const SUPPLIER_INVOICE_LINE_OBJECT_NAME = 'supplierInvoiceLine';
const SUPPLIER_INVOICE_LINE_PARENT_FIELD_NAME = 'supplierInvoiceId';
const SUPPLIER_INVOICE_OBJECT_NAME = 'supplierInvoice';

// One decorated class per (object, operation) hook key: the query-hook
// storage holds a single key per class, so hooks cannot be merged further.
const createErpDocumentGuardHook = (
  objectNameSingular: (typeof ERP_DOCUMENT_OBJECT_NAMES)[number],
  operation: ErpDocumentGuardOperation,
): Type<WorkspacePreQueryHookInstance> => {
  @WorkspaceQueryHook(`${objectNameSingular}.${operation}`)
  class ErpPurchasesDocumentGuardPreQueryHook implements WorkspacePreQueryHookInstance {
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

  return ErpPurchasesDocumentGuardPreQueryHook;
};

// One decorated class per (lineObject, operation) hook key, mirroring
// createErpDocumentGuardHook above — the shared check itself lives in
// ErpDocumentLineGuardService (erp-sales) so it isn't duplicated per document
// type.
const createErpDocumentLineGuardHook = (
  lineObjectNameSingular: string,
  parentFieldName: string,
  parentObjectNameSingular: string,
  operation: ErpDocumentGuardOperation,
): Type<WorkspacePreQueryHookInstance> => {
  @WorkspaceQueryHook(`${lineObjectNameSingular}.${operation}`)
  class ErpPurchasesDocumentLineGuardPreQueryHook implements WorkspacePreQueryHookInstance {
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

  return ErpPurchasesDocumentLineGuardPreQueryHook;
};

export const ERP_PURCHASES_GUARD_HOOKS: Type<WorkspacePreQueryHookInstance>[] =
  [
    ...ERP_DOCUMENT_OBJECT_NAMES.flatMap((objectNameSingular) =>
      ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
        createErpDocumentGuardHook(objectNameSingular, operation),
      ),
    ),
    ...ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentLineGuardHook(
        SUPPLIER_INVOICE_LINE_OBJECT_NAME,
        SUPPLIER_INVOICE_LINE_PARENT_FIELD_NAME,
        SUPPLIER_INVOICE_OBJECT_NAME,
        operation,
      ),
    ),
  ];
