import { Module, type OnModuleInit } from '@nestjs/common';

import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
import { GlContributorRegistry } from 'src/engine/core-modules/erp/gl-contributor.registry';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { ERP_ACCOUNTING_GUARD_HOOKS } from 'src/engine/core-modules/erp-accounting/query-hooks/erp-accounting-guard.pre-query.hooks';
import { GlContributorsService } from 'src/engine/core-modules/erp-accounting/services/gl-contributors.service';
import { ManualEntryPostingRulesService } from 'src/engine/core-modules/erp-accounting/services/manual-entry-posting-rules.service';

// Блок «Бухгалтерия» (glue): GL-контрибьюторы типовых проводок всех
// документов блоков + провайдер ручной операции + guard-хуки на manualEntry,
// его строки и регистр glEntry. Guard-сервисы переиспользуются из erp-sales
// (объект-агностичные), explicit registration per erp/WIRING.md §3.
// stockTransfer контрибьютора не имеет — ruling: БЕЗ проводок.
@Module({
  imports: [ErpModule],
  providers: [
    ErpDocumentGuardService,
    ErpDocumentLineGuardService,
    GlContributorsService,
    ManualEntryPostingRulesService,
    ...ERP_ACCOUNTING_GUARD_HOOKS,
  ],
})
export class ErpAccountingModule implements OnModuleInit {
  constructor(
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly glContributorRegistry: GlContributorRegistry,
    private readonly glContributorsService: GlContributorsService,
    private readonly manualEntryPostingRulesService: ManualEntryPostingRulesService,
  ) {}

  onModuleInit(): void {
    this.postingRulesRegistry.registerPostingRules(
      'manualEntry',
      this.manualEntryPostingRulesService,
    );

    this.glContributorRegistry.registerGlContributor(
      'salesInvoice',
      (context, document, lines) =>
        this.glContributorsService.salesInvoiceGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'payment',
      (context, document, lines) =>
        this.glContributorsService.paymentGlEntries(context, document, lines),
    );
    this.glContributorRegistry.registerGlContributor(
      'supplierInvoice',
      (context, document, lines) =>
        this.glContributorsService.supplierInvoiceGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'supplierPayment',
      (context, document, lines) =>
        this.glContributorsService.supplierPaymentGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'goodsReceipt',
      (context, document, lines) =>
        this.glContributorsService.goodsReceiptGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'salesShipment',
      (context, document, lines) =>
        this.glContributorsService.salesShipmentGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'goodsWriteOff',
      (context, document, lines) =>
        this.glContributorsService.goodsWriteOffGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'goodsPosting',
      (context, document, lines) =>
        this.glContributorsService.goodsPostingGlEntries(
          context,
          document,
          lines,
        ),
    );
    this.glContributorRegistry.registerGlContributor(
      'manualEntry',
      (context, document, lines) =>
        this.glContributorsService.manualEntryGlEntries(
          context,
          document,
          lines,
        ),
    );
  }
}
