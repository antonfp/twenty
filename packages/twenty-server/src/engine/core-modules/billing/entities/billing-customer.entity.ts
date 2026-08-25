import { Field, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { BillingSubscriptionEntity } from 'src/engine/core-modules/billing/entities/billing-subscription.entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingCustomer', schema: 'core' })
@ObjectType('BillingCustomer')
export class BillingCustomerEntity extends WorkspaceRelatedEntity {
  @Field(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  stripeCustomerId: string;

  @Field(() => Boolean, { nullable: true })
  @Column({ nullable: true, type: 'boolean' })
  hasPaymentMethod: boolean | null;

  @Column({ type: 'bigint', nullable: false, default: 0 })
  creditBalanceMicro: number;

  @OneToMany(
    () => BillingSubscriptionEntity,
    (billingSubscription) => billingSubscription.billingCustomer,
  )
  billingSubscriptions: Relation<BillingSubscriptionEntity[]>;
}
