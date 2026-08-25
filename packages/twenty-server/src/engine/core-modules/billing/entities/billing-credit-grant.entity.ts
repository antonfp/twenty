import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { BillingCreditGrantType } from 'src/engine/core-modules/billing/enums/billing-credit-grant-type.enum';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingCreditGrant', schema: 'core' })
export class BillingCreditGrantEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'bigint' })
  amountMicro: number;

  @Column({ nullable: false, type: 'text' })
  type: BillingCreditGrantType;

  @Column({ nullable: false, type: 'timestamptz' })
  effectiveAt: Date;

  @Column({ nullable: false, type: 'timestamptz' })
  expiresAt: Date;

  @Column({ nullable: true, type: 'timestamptz' })
  revokedAt: Date | null;

  @Column({ nullable: true, type: 'uuid' })
  revokedByUserId: string | null;

  @Column({ nullable: true, type: 'uuid' })
  grantedByUserId: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  reason: string | null;

  @Column({ nullable: true, type: 'varchar' })
  idempotencyKey: string | null;

  @Column({ nullable: true, type: 'uuid' })
  sourceGrantId: string | null;

  @Column({ type: 'timestamptz' })
  createdAt: Date;
}
