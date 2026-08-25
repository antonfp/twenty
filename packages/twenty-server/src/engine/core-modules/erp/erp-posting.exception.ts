import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { CustomException } from 'src/utils/custom-exception';

export const ERP_POSTING_EXCEPTION_CODE = {
  UNKNOWN_DOCUMENT_OBJECT: 'UNKNOWN_DOCUMENT_OBJECT',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  INVALID_DOC_STATUS: 'INVALID_DOC_STATUS',
  NO_POSTING_RULES: 'NO_POSTING_RULES',
  UNBALANCED_GL_ENTRIES: 'UNBALANCED_GL_ENTRIES',
  PERIOD_LOCKED: 'PERIOD_LOCKED',
  POSTING_FAILED: 'POSTING_FAILED',
} as const;

export type ErpPostingExceptionCode =
  (typeof ERP_POSTING_EXCEPTION_CODE)[keyof typeof ERP_POSTING_EXCEPTION_CODE];

export class ErpPostingException extends CustomException<ErpPostingExceptionCode> {
  constructor(
    message: string,
    code: ErpPostingExceptionCode,
    {
      userFriendlyMessage,
    }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? msg`Document posting operation failed.`,
    });
  }
}
