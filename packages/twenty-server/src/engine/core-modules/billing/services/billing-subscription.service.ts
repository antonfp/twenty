import { Injectable } from '@nestjs/common';

import { BillingEntitlementDTO } from 'src/engine/core-modules/billing/dtos/billing-entitlement.dto';
import { type BillingCustomerEntity } from 'src/engine/core-modules/billing/entities/billing-customer.entity';
import { type BillingSubscriptionEntity } from 'src/engine/core-modules/billing/entities/billing-subscription.entity';
import { BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { EnterprisePlanService } from 'src/engine/core-modules/enterprise/services/enterprise-plan.service';

// Clean-room stub preserving the billing-disabled semantics of the removed
// Enterprise billing module: no customer, no subscriptions, entitlements
// driven solely by the enterprise key.
@Injectable()
export class BillingSubscriptionService {
  constructor(private readonly enterprisePlanService: EnterprisePlanService) {}

  async getBillingSubscriptions(
    _workspaceId: string,
  ): Promise<BillingSubscriptionEntity[]> {
    return [];
  }

  async getBillingCustomer(
    _workspaceId: string,
  ): Promise<BillingCustomerEntity | null> {
    return null;
  }

  async getCurrentBillingSubscription(_criteria: {
    workspaceId?: string;
    stripeCustomerId?: string;
  }): Promise<BillingSubscriptionEntity | undefined> {
    return undefined;
  }

  async cancelSubscription(_workspaceId: string): Promise<void> {
    // No subscription to cancel on this fork.
  }

  async assertSubscriptionCanceledOrNone(_workspaceId: string): Promise<void> {
    // No subscription can exist on this fork.
  }

  async getWorkspaceEntitlements(
    _workspaceId: string,
  ): Promise<BillingEntitlementDTO[]> {
    const hasValidEnterprisePlan = this.enterprisePlanService.isValid();

    return Object.values(BillingEntitlementKey).map((key) => ({
      key,
      value: hasValidEnterprisePlan,
    }));
  }
}
