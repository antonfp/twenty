import {
  BillingException,
  getBillingExceptionStatusCode,
} from 'src/engine/core-modules/billing/billing.exception';
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UserInputError,
} from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

export const billingGraphqlApiExceptionHandler = (error: Error) => {
  if (error instanceof BillingException) {
    switch (getBillingExceptionStatusCode(error.code)) {
      case 404:
        throw new NotFoundError(error);
      case 400:
        throw new UserInputError(error);
      case 402:
        throw new ForbiddenError(error);
      case 500:
        throw new InternalServerError(error);
    }
  }

  throw error;
};
