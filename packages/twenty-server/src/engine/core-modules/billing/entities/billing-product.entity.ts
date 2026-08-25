import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { BillingPriceEntity } from 'src/engine/core-modules/billing/entities/billing-price.entity';
import { BillingProductMetadata } from 'src/engine/core-modules/billing/types/billing-product-metadata.type';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingProduct', schema: 'core' })
export class BillingProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'text', default: '' })
  description: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, type: 'jsonb', default: [] })
  images: string[];

  @Column({ nullable: false, unique: true })
  stripeProductId: string;

  @Column({ nullable: false, type: 'jsonb', default: {} })
  metadata: BillingProductMetadata;

  @OneToMany(
    () => BillingPriceEntity,
    (billingPrice) => billingPrice.billingProduct,
  )
  billingPrices: Relation<BillingPriceEntity[]>;
}
