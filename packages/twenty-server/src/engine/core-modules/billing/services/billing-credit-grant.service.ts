import { Injectable } from '@nestjs/common';

import { type BillingCreditGrantEntity } from 'src/engine/core-modules/billing/entities/billing-credit-grant.entity';

// Clean-room stub preserving the billing-disabled semantics of the removed
// Enterprise billing module: the credit ledger does not exist, so it is
// always empty.
@Injectable()
export class BillingCreditGrantService {
  async getSpendableCreditsMicro(_workspaceId: string): Promise<number> {
    return 0;
  }

  async listGrants(_workspaceId: string): Promise<BillingCreditGrantEntity[]> {
    return [];
  }

  async findGrantByIdempotencyKey(
    _workspaceId: string,
    _idempotencyKey: string,
  ): Promise<BillingCreditGrantEntity | null> {
    return null;
  }
}
