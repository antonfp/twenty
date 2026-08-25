import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

import { CustomException } from 'src/utils/custom-exception';

export enum BillingExceptionCode {
  BILLING_CUSTOMER_NOT_FOUND = 'BILLING_CUSTOMER_NOT_FOUND',
  BILLING_SUBSCRIPTION_NOT_FOUND = 'BILLING_SUBSCRIPTION_NOT_FOUND',
  BILLING_CREDIT_GRANT_NOT_FOUND = 'BILLING_CREDIT_GRANT_NOT_FOUND',
  BILLING_CREDIT_AMOUNT_INVALID = 'BILLING_CREDIT_AMOUNT_INVALID',
  BILLING_CREDIT_GRANT_TYPE_NOT_GRANTABLE = 'BILLING_CREDIT_GRANT_TYPE_NOT_GRANTABLE',
  BILLING_CREDITS_EXHAUSTED = 'BILLING_CREDITS_EXHAUSTED',
  BILLING_UNHANDLED_ERROR = 'BILLING_UNHANDLED_ERROR',
}

const getBillingExceptionUserFriendlyMessage = (
  code: BillingExceptionCode,
): MessageDescriptor => {
  switch (code) {
    case BillingExceptionCode.BILLING_CUSTOMER_NOT_FOUND:
      return msg`Billing customer not found.`;
    case BillingExceptionCode.BILLING_SUBSCRIPTION_NOT_FOUND:
      return msg`Subscription not found.`;
    case BillingExceptionCode.BILLING_CREDIT_GRANT_NOT_FOUND:
      return msg`Credit grant not found.`;
    case BillingExceptionCode.BILLING_CREDIT_AMOUNT_INVALID:
      return msg`Invalid credit amount.`;
    case BillingExceptionCode.BILLING_CREDIT_GRANT_TYPE_NOT_GRANTABLE:
      return msg`This kind of credit grant cannot be created by hand.`;
    case BillingExceptionCode.BILLING_CREDITS_EXHAUSTED:
      return msg`You have exhausted your credits. Please upgrade your plan to continue.`;
    case BillingExceptionCode.BILLING_UNHANDLED_ERROR:
      return msg`An unexpected billing error occurred.`;
  }
};

export const getBillingExceptionStatusCode = (
  code: BillingExceptionCode,
): 400 | 402 | 404 | 500 => {
  switch (code) {
    case BillingExceptionCode.BILLING_CUSTOMER_NOT_FOUND:
    case BillingExceptionCode.BILLING_SUBSCRIPTION_NOT_FOUND:
    case BillingExceptionCode.BILLING_CREDIT_GRANT_NOT_FOUND:
      return 404;
    case BillingExceptionCode.BILLING_CREDIT_AMOUNT_INVALID:
    case BillingExceptionCode.BILLING_CREDIT_GRANT_TYPE_NOT_GRANTABLE:
      return 400;
    case BillingExceptionCode.BILLING_CREDITS_EXHAUSTED:
      return 402;
    case BillingExceptionCode.BILLING_UNHANDLED_ERROR:
      return 500;
  }
};

export class BillingException extends CustomException<BillingExceptionCode> {
  constructor(
    message: string,
    code: BillingExceptionCode,
    { userFriendlyMessage }: { userFriendlyMessage?: MessageDescriptor } = {},
  ) {
    super(message, code, {
      userFriendlyMessage:
        userFriendlyMessage ?? getBillingExceptionUserFriendlyMessage(code),
    });
    this.statusCode = getBillingExceptionStatusCode(code);
  }
}
