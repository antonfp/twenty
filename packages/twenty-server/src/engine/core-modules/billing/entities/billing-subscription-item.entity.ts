import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { BillingProductEntity } from 'src/engine/core-modules/billing/entities/billing-product.entity';
import { BillingSubscriptionEntity } from 'src/engine/core-modules/billing/entities/billing-subscription.entity';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingSubscriptionItem', schema: 'core' })
export class BillingSubscriptionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  billingSubscriptionId: string;

  @ManyToOne(
    () => BillingSubscriptionEntity,
    (billingSubscription) => billingSubscription.billingSubscriptionItems,
  )
  billingSubscription: Relation<BillingSubscriptionEntity>;

  @ManyToOne(() => BillingProductEntity)
  @JoinColumn({
    name: 'stripeProductId',
    referencedColumnName: 'stripeProductId',
  })
  billingProduct: Relation<BillingProductEntity>;

  @Column({ nullable: false })
  stripeProductId: string;

  @Column({ nullable: false })
  stripePriceId: string;

  @Column({ nullable: true, type: 'numeric' })
  quantity: number | null;

  @Column({ type: 'boolean', default: false })
  hasReachedCurrentPeriodCap: boolean;
}
