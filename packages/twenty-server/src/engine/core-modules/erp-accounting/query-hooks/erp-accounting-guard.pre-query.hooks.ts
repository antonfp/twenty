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
// the object lists are accounting-specific. account (план счетов) — обычный
// редактируемый справочник, guard не нужен.
const MANUAL_ENTRY_OBJECT_NAME = 'manualEntry';
const MANUAL_ENTRY_LINE_OBJECT_NAME = 'manualEntryLine';
const MANUAL_ENTRY_LINE_PARENT_FIELD_NAME = 'manualEntryId';

const GL_ENTRY_OBJECT_NAME = 'glEntry';

const GL_ENTRY_BLOCKED_MESSAGE = msg`Регистр проводок формируется автоматически при проведении документов — ручные изменения запрещены.`;

export const ERP_ACCOUNTING_GUARD_HOOKS: Type<WorkspacePreQueryHookInstance>[] =
  [
    ...ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentGuardHook(MANUAL_ENTRY_OBJECT_NAME, operation),
    ),
    ...ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpDocumentLineGuardHook(
        MANUAL_ENTRY_LINE_OBJECT_NAME,
        MANUAL_ENTRY_LINE_PARENT_FIELD_NAME,
        MANUAL_ENTRY_OBJECT_NAME,
        operation,
      ),
    ),
    ...ERP_DOCUMENT_GUARD_OPERATIONS.map((operation) =>
      createErpRegisterGuardHook(
        GL_ENTRY_OBJECT_NAME,
        operation,
        GL_ENTRY_BLOCKED_MESSAGE,
      ),
    ),
  ];
