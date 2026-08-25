import { Injectable } from '@nestjs/common';

import {
  BillingException,
  BillingExceptionCode,
} from 'src/engine/core-modules/billing/billing.exception';
import { type BillingResourceCreditUsageDTO } from 'src/engine/core-modules/billing/dtos/billing-resource-credit-usage.dto';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

export type CreditAvailability =
  | { hasAvailableCredits: true }
  | {
      hasAvailableCredits: false;
      reason: 'workspace-suspended' | 'no-subscription' | 'no-credits';
    };

// Clean-room stub preserving the billing-disabled semantics of the removed
// Enterprise billing module: credits are always available and nothing is
// metered. AI chat and workflow execution call these gates on every request,
// so they must never throw here.
@Injectable()
export class BillingUsageService {
  async canFeatureBeUsed(_workspaceId: string): Promise<boolean> {
    return true;
  }

  async getCreditAvailability(
    _workspaceId: string,
  ): Promise<CreditAvailability> {
    return { hasAvailableCredits: true };
  }

  async hasAvailableCredits(_workspaceId: string): Promise<boolean> {
    return true;
  }

  async hasAvailableCreditsOrThrow(_workspaceId: string): Promise<void> {
    // Credits are unlimited without billing.
  }

  async decrementAvailableCreditsInCache(_params: {
    workspaceId: string;
    usedCredits: number;
  }): Promise<number> {
    return 0;
  }

  async getResourceCreditProductUsage(
    workspace: WorkspaceEntity,
  ): Promise<BillingResourceCreditUsageDTO[]> {
    // Matches the disabled-mode behavior of the removed implementation, which
    // could never find a subscription. The only caller catches this.
    throw new BillingException(
      `No active subscription found for workspace ${workspace.id}`,
      BillingExceptionCode.BILLING_SUBSCRIPTION_NOT_FOUND,
    );
  }
}
