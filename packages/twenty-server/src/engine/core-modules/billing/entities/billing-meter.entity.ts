import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Compile-time stub: billing is removed from this fork.
@Entity({ name: 'billingMeter', schema: 'core' })
export class BillingMeterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  stripeMeterId: string;

  @Column({ nullable: false })
  displayName: string;
}
