import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { assertUnreachable } from 'twenty-shared/utils';

import { CustomException } from 'src/utils/custom-exception';

export enum DadataExceptionCode {
  INVALID_INN = 'INVALID_INN',
  API_KEY_NOT_CONFIGURED = 'API_KEY_NOT_CONFIGURED',
  RATE_LIMITED = 'RATE_LIMITED',
  FORBIDDEN = 'FORBIDDEN',
  REQUEST_FAILED = 'REQUEST_FAILED',
}

const getDadataExceptionUserFriendlyMessage = (code: DadataExceptionCode) => {
  switch (code) {
    case DadataExceptionCode.INVALID_INN:
      return msg`Invalid INN: expected 10 or 12 digits with a valid checksum.`;
    case DadataExceptionCode.API_KEY_NOT_CONFIGURED:
      return msg`DaData API key is not configured.`;
    case DadataExceptionCode.RATE_LIMITED:
      return msg`DaData rate limit exceeded, please retry later.`;
    case DadataExceptionCode.FORBIDDEN:
      return msg`DaData rejected the request: check the API key or the daily request limit.`;
    case DadataExceptionCode.REQUEST_FAILED:
      return msg`DaData request failed.`;
    default:
      assertUnreachable(code);
  }
};

export class DadataException extends CustomException<DadataExceptionCode> {
  constructor(
    message: string,
    code: DadataExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getDadataExceptionUserFriendlyMessage(code),
    });
  }
}
