import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { BillingEntitlementKey } from 'src/engine/core-modules/billing/enums/billing-entitlement-key.enum';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingEntitlement', schema: 'core' })
export class BillingEntitlementEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'text' })
  key: BillingEntitlementKey;

  @Column({ nullable: false })
  stripeCustomerId: string;

  @Column({ nullable: false })
  value: boolean;
}
