import { Module } from '@nestjs/common';

import { ErpPostingResolver } from 'src/engine/core-modules/erp/erp-posting.resolver';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { PeriodLockService } from 'src/engine/core-modules/erp/services/period-lock.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';

// GlobalWorkspaceOrmManager comes from the @Global()
// GlobalWorkspaceDatasourceModule, so no imports are needed.
@Module({
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
