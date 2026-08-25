import { Injectable } from '@nestjs/common';

import {
  BillingException,
  BillingExceptionCode,
} from 'src/engine/core-modules/billing/billing.exception';
import { type BillingCreditGrantEntity } from 'src/engine/core-modules/billing/entities/billing-credit-grant.entity';
import { type BillingCreditGrantType } from 'src/engine/core-modules/billing/enums/billing-credit-grant-type.enum';

export type GrantCreditsParams = {
  workspaceId: string;
  amountMicro: number;
  type: BillingCreditGrantType;
  reason?: string | null;
  grantedByUserId?: string | null;
  idempotencyKey?: string | null;
  effectiveAt?: Date;
  expiresAt?: Date;
  sourceGrantId?: string | null;
};

// Clean-room stub preserving the billing-disabled semantics of the removed
// Enterprise billing module: grants are silently skipped, exactly like the
// original early-returned when IS_BILLING_ENABLED was unset.
@Injectable()
export class BillingCreditService {
  async grantCredits(
    _params: GrantCreditsParams,
  ): Promise<BillingCreditGrantEntity | null> {
    return null;
  }

  async revokeGrant(params: {
    workspaceId: string;
    grantId: string;
    revokedByUserId?: string | null;
  }): Promise<BillingCreditGrantEntity> {
    throw new BillingException(
      `Credit grant ${params.grantId} not found for workspace ${params.workspaceId}`,
      BillingExceptionCode.BILLING_CREDIT_GRANT_NOT_FOUND,
    );
  }
}
