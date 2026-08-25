import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import graphqlTypeJson from 'graphql-type-json';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { BillingSubscriptionItemDTO } from 'src/engine/core-modules/billing/dtos/billing-subscription-item.dto';
import { BillingSubscriptionSchedulePhaseDTO } from 'src/engine/core-modules/billing/dtos/billing-subscription-schedule-phase.dto';
import { BillingCustomerEntity } from 'src/engine/core-modules/billing/entities/billing-customer.entity';
import { BillingSubscriptionItemEntity } from 'src/engine/core-modules/billing/entities/billing-subscription-item.entity';
import { BillingSubscriptionCollectionMethod } from 'src/engine/core-modules/billing/enums/billing-subscription-collection-method.enum';
import { SubscriptionInterval } from 'src/engine/core-modules/billing/enums/billing-subscription-interval.enum';
import { SubscriptionStatus } from 'src/engine/core-modules/billing/enums/billing-subscription-status.enum';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

registerEnumType(SubscriptionStatus, { name: 'SubscriptionStatus' });
registerEnumType(SubscriptionInterval, { name: 'SubscriptionInterval' });

// Compile-time stub: billing is removed from this fork. The entity is excluded
// from the TypeORM datasource when IS_BILLING_ENABLED is not 'true', so only
// the class shape and the GraphQL type it declares are ever used.
@Entity({ name: 'billingSubscription', schema: 'core' })
@ObjectType('BillingSubscription')
export class BillingSubscriptionEntity extends WorkspaceRelatedEntity {
  @Field(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  stripeCustomerId: string;

  @Column({ unique: true, nullable: false })
  stripeSubscriptionId: string;

  @Field(() => SubscriptionStatus)
  @Column({ type: 'text', nullable: false })
  status: SubscriptionStatus;

  @Field(() => SubscriptionInterval, { nullable: true })
  @Column({ type: 'text', nullable: true })
  interval: SubscriptionInterval;

  @Field(() => [BillingSubscriptionItemDTO], { nullable: true })
  @OneToMany(
    () => BillingSubscriptionItemEntity,
    (billingSubscriptionItem) => billingSubscriptionItem.billingSubscription,
  )
  billingSubscriptionItems: Relation<BillingSubscriptionItemEntity[]>;

  @ManyToOne(
    () => BillingCustomerEntity,
    (billingCustomer) => billingCustomer.billingSubscriptions,
    { nullable: false, createForeignKeyConstraints: false },
  )
  @JoinColumn({
    referencedColumnName: 'stripeCustomerId',
    name: 'stripeCustomerId',
  })
  billingCustomer: Relation<BillingCustomerEntity>;

  @Column({ nullable: false, default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ nullable: false, default: 'USD' })
  currency: string;

  @Field(() => Date, { nullable: true })
  @Column({ nullable: false, type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ nullable: false, type: 'timestamptz' })
  currentPeriodStart: Date;

  @Field(() => graphqlTypeJson)
  @Column({ nullable: false, type: 'jsonb', default: {} })
  metadata: Record<string, string>;

  @Field(() => [BillingSubscriptionSchedulePhaseDTO])
  @Column({ nullable: false, type: 'jsonb', default: [] })
  phases: Array<BillingSubscriptionSchedulePhaseDTO>;

  @Field(() => Date, { nullable: true })
  @Column({ nullable: true, type: 'timestamptz' })
  cancelAt: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  canceledAt: Date | null;

  @Column({ type: 'text', nullable: false })
  collectionMethod: BillingSubscriptionCollectionMethod;

  @Column({ nullable: true, type: 'timestamptz' })
  endedAt: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  trialStart: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  trialEnd: Date | null;
}
