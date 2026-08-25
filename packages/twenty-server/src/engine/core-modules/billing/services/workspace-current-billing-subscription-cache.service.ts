import { Injectable } from '@nestjs/common';

import { NO_BILLING_SUBSCRIPTION } from 'src/engine/core-modules/billing/constants/no-billing-subscription.constant';
import { type CurrentBillingSubscription } from 'src/engine/core-modules/billing/types/flat-billing-subscription.type';
import { WorkspaceCache } from 'src/engine/workspace-cache/decorators/workspace-cache.decorator';
import { WorkspaceCacheProvider } from 'src/engine/workspace-cache/interfaces/workspace-cache-provider.service';

// Keeps the 'currentBillingSubscription' workspace-cache key computable now
// that billing is removed: without billing there is never a subscription.
@Injectable()
@WorkspaceCache('currentBillingSubscription', { packingPonderation: 1 })
export class WorkspaceCurrentBillingSubscriptionCacheService extends WorkspaceCacheProvider<CurrentBillingSubscription> {
  async computeForCache(
    _workspaceId: string,
  ): Promise<CurrentBillingSubscription> {
    return NO_BILLING_SUBSCRIPTION;
  }
}
