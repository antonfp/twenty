import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { BillingProductEntity } from 'src/engine/core-modules/billing/entities/billing-product.entity';

// Tiered pricing rows as stored in the jsonb column (Stripe tier shape).
export type BillingPriceTierJson = {
  up_to?: number | 'inf' | null;
  flat_amount?: number | null;
  unit_amount?: number | null;
};

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingPrice', schema: 'core' })
export class BillingPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  stripePriceId: string;

  @Column({ nullable: false })
  stripeProductId: string;

  @Column({ nullable: true, type: 'jsonb' })
  tiers: BillingPriceTierJson[] | null;

  @Column({ nullable: true, type: 'numeric' })
  unitAmount: number | null;

  @ManyToOne(
    () => BillingProductEntity,
    (billingProduct) => billingProduct.billingPrices,
    { nullable: true },
  )
  @JoinColumn({
    referencedColumnName: 'stripeProductId',
    name: 'stripeProductId',
  })
  billingProduct: Relation<BillingProductEntity> | null;
}
