import { Module } from '@nestjs/common';

import { WorkspaceIteratorModule } from 'src/database/commands/command-runners/workspace-iterator.module';
import { FeatureFlagModule } from 'src/engine/core-modules/feature-flag/feature-flag.module';

// The billing-v2 migration command was Enterprise-licensed and removed along
// with the billing module; this fork never ran with billing enabled, so the
// command had nothing to migrate.
@Module({
  imports: [FeatureFlagModule, WorkspaceIteratorModule],
  providers: [],
})
export class V2_4_UpgradeVersionCommandModule {}
