import { Module, type OnModuleInit } from '@nestjs/common';

import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { ERP_PURCHASES_GUARD_HOOKS } from 'src/engine/core-modules/erp-purchases/query-hooks/erp-purchases-guard.pre-query.hooks';
import { SupplierInvoicePostingRulesService } from 'src/engine/core-modules/erp-purchases/services/supplier-invoice-posting-rules.service';
import { SupplierPaymentPostingRulesService } from 'src/engine/core-modules/erp-purchases/services/supplier-payment-posting-rules.service';

// Блок «Закупки»: правила проведения счёта поставщика и оплаты поставщику,
// guard-хуки на документы и их строки. ErpDocumentGuardService /
// ErpDocumentLineGuardService переиспользуются из erp-sales (объект-
// агностичные сервисы) — не дублируются. Explicit registration per
// erp/WIRING.md §3.
@Module({
  imports: [ErpModule],
  providers: [
    ErpDocumentGuardService,
    ErpDocumentLineGuardService,
    SupplierInvoicePostingRulesService,
    SupplierPaymentPostingRulesService,
    ...ERP_PURCHASES_GUARD_HOOKS,
  ],
})
export class ErpPurchasesModule implements OnModuleInit {
  constructor(
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly supplierInvoicePostingRulesService: SupplierInvoicePostingRulesService,
    private readonly supplierPaymentPostingRulesService: SupplierPaymentPostingRulesService,
  ) {}

  onModuleInit(): void {
    this.postingRulesRegistry.registerPostingRules(
      'supplierInvoice',
      this.supplierInvoicePostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'supplierPayment',
      this.supplierPaymentPostingRulesService,
    );
  }
}
