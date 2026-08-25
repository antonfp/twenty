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

export const ERP_PURCHASES_GUARD_HOOKS: Type<WorkspacePreQueryHookInstance>[] =
  ERP_DOCUMENT_OBJECT_NAMES.flatMap((objectNameSingular) =>
    ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentGuardHook(objectNameSingular, operation),
    ),
  );
