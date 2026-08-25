import { Module } from '@nestjs/common';

import { ErpPostingResolver } from 'src/engine/core-modules/erp/erp-posting.resolver';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';

// GlobalWorkspaceOrmManager comes from the @Global()
// GlobalWorkspaceDatasourceModule, so no imports are needed.
@Module({
  imports: [PermissionsModule, WorkspaceCacheModule, WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [
    PostingRulesRegistry,
    PeriodLockService,
    DocumentNumberingService,
    PostingService,
    ErpPostingResolver,
  ],
  exports: [
    PostingRulesRegistry,
    PeriodLockService,
    DocumentNumberingService,
    PostingService,
  ],
})
export class ErpModule {}
