import { Module } from '@nestjs/common';

import { ErpPostingResolver } from 'src/engine/core-modules/erp/erp-posting.resolver';
import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { PermissionsModule } from 'src/engine/metadata-modules/permissions/permissions.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';
import { GlContributorRegistry } from 'src/engine/core-modules/erp/gl-contributor.registry';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';

// GlobalWorkspaceOrmManager comes from the @Global()
// GlobalWorkspaceDatasourceModule, so no imports are needed.
@Module({
  imports: [
    // PermissionsModule provides/exports ApiKeyRoleService (needed by
    // ErpPostingResolver's api-key auth branch); UserRoleModule provides
    // UserRoleService (its user-auth branch) — neither re-exports the other.
    PermissionsModule,
    UserRoleModule,
    WorkspaceCacheModule,
    WorkspaceManyOrAllFlatEntityMapsCacheModule,
  ],
  providers: [
    PostingRulesRegistry,
    GlContributorRegistry,
    PeriodLockService,
    DocumentNumberingService,
    PostingService,
    ErpObjectPermissionGuardService,
    ErpActorRoleResolverService,
    ErpPostingResolver,
  ],
  exports: [
    PostingRulesRegistry,
    GlContributorRegistry,
    PeriodLockService,
    DocumentNumberingService,
    PostingService,
    ErpObjectPermissionGuardService,
    ErpActorRoleResolverService,
  ],
})
export class ErpModule {}
