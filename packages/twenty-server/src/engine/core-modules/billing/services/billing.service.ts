import { Injectable } from '@nestjs/common';

import { type BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

// Clean-room stub preserving the billing-disabled semantics of the removed
// Enterprise billing module: every check answers as if the workspace is fully
// entitled and subscribed.
@Injectable()
export class BillingService {
  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  isBillingEnabled() {
    return this.twentyConfigService.get('IS_BILLING_ENABLED');
  }

  async ensureBillingCustomer(_params: {
    userEmail: string;
    workspaceId: string;
    workspaceDisplayName: string | undefined;
  }): Promise<void> {
    // No billing backend on this fork.
  }

  async hasWorkspaceAnySubscription(_workspaceId: string): Promise<boolean> {
    return true;
  }

  async hasEntitlement(
    _workspaceId: string,
    _entitlementKey: BillingEntitlementKey,
  ): Promise<boolean> {
    return true;
  }

  async isSubscriptionIncompleteOnboardingStatus(
    _workspaceId: string,
  ): Promise<boolean> {
    return false;
  }
}
