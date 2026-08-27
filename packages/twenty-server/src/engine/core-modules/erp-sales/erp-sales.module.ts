import { Module, type OnModuleInit } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { SalesInvoicePrintController } from 'src/engine/core-modules/erp-sales/controllers/sales-invoice-print.controller';
import { ERP_SALES_GUARD_HOOKS } from 'src/engine/core-modules/erp-sales/query-hooks/erp-sales-guard.pre-query.hooks';
import { SalesInvoiceRevisionResolver } from 'src/engine/core-modules/erp-sales/sales-invoice-revision.resolver';
import { CreateInvoiceRevisionService } from 'src/engine/core-modules/erp-sales/services/create-invoice-revision.service';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { PaymentPostingRulesService } from 'src/engine/core-modules/erp-sales/services/payment-posting-rules.service';
import { SalesInvoicePostingRulesService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-posting-rules.service';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';

// Блок «Продажи»: правила проведения счёта и оплаты, guard-хуки на документы
// и регистр, печатная форма счёта. Explicit registration per WIRING.md §3.
@Module({
  imports: [ErpModule, TokenModule, WorkspaceCacheStorageModule],
  controllers: [SalesInvoicePrintController],
  providers: [
    JwtAuthGuard,
    WorkspaceAuthGuard,
    ErpDocumentGuardService,
    ErpDocumentLineGuardService,
    PaymentPostingRulesService,
    SalesInvoicePostingRulesService,
    SalesInvoicePrintService,
    CreateInvoiceRevisionService,
    SalesInvoiceRevisionResolver,
    ...ERP_SALES_GUARD_HOOKS,
  ],
  // SalesInvoicePrintService is consumed by McpModule's print-template tools
  // (get_print_template/render_print_preview need to actually render SCHET);
  // CreateInvoiceRevisionService by McpModule's create_invoice_revision tool
  // and by ErpAgentToolService's bridge (same reasoning).
  exports: [SalesInvoicePrintService, CreateInvoiceRevisionService],
})
export class ErpSalesModule implements OnModuleInit {
  constructor(
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly salesInvoicePostingRulesService: SalesInvoicePostingRulesService,
    private readonly paymentPostingRulesService: PaymentPostingRulesService,
  ) {}

  onModuleInit(): void {
    this.postingRulesRegistry.registerPostingRules(
      'salesInvoice',
      this.salesInvoicePostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'payment',
      this.paymentPostingRulesService,
    );
  }
}
