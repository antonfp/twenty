import { Module } from '@nestjs/common';

import { BillingCreditGrantService } from 'src/engine/core-modules/billing/services/billing-credit-grant.service';
import { BillingCreditService } from 'src/engine/core-modules/billing/services/billing-credit.service';
import { BillingSubscriptionService } from 'src/engine/core-modules/billing/services/billing-subscription.service';
import { BillingUsageService } from 'src/engine/core-modules/billing/services/billing-usage.service';
import { BillingService } from 'src/engine/core-modules/billing/services/billing.service';
import { WorkspaceCurrentBillingSubscriptionCacheService } from 'src/engine/core-modules/billing/services/workspace-current-billing-subscription-cache.service';

// Clean-room stub of the removed Enterprise billing module. Exposes only the
// services the rest of the codebase consumes, all answering with
// billing-disabled semantics.
@Module({
  providers: [
    BillingService,
    BillingSubscriptionService,
    BillingUsageService,
    BillingCreditService,
    BillingCreditGrantService,
    WorkspaceCurrentBillingSubscriptionCacheService,
  ],
  exports: [
    BillingService,
    BillingSubscriptionService,
    BillingUsageService,
    BillingCreditService,
    BillingCreditGrantService,
  ],
})
export class BillingModule {}
