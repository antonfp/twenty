import { Module, type OnModuleInit } from '@nestjs/common';

import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
import { GlContributorRegistry } from 'src/engine/core-modules/erp/gl-contributor.registry';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { AccountCardController } from 'src/engine/core-modules/erp-accounting/controllers/account-card.controller';
import { BankStatementImportController } from 'src/engine/core-modules/erp-accounting/controllers/bank-statement-import.controller';
import { FinancialStatementsController } from 'src/engine/core-modules/erp-accounting/controllers/financial-statements.controller';
import { KudirController } from 'src/engine/core-modules/erp-accounting/controllers/kudir.controller';
import { TrialBalanceController } from 'src/engine/core-modules/erp-accounting/controllers/trial-balance.controller';
import { ERP_ACCOUNTING_GUARD_HOOKS } from 'src/engine/core-modules/erp-accounting/query-hooks/erp-accounting-guard.pre-query.hooks';
import { AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { BankStatementImportService } from 'src/engine/core-modules/erp-accounting/services/bank-statement-import.service';
import { GlContributorsService } from 'src/engine/core-modules/erp-accounting/services/gl-contributors.service';
import { IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
import { ManualEntryPostingRulesService } from 'src/engine/core-modules/erp-accounting/services/manual-entry-posting-rules.service';
import { ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';
import { TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Блок «Бухгалтерия» (glue): GL-контрибьюторы типовых проводок всех
// документов блоков + провайдер ручной операции + guard-хуки на manualEntry,
// его строки и регистр glEntry + печатный ОСВ-отчёт (Task 3). Guard-сервисы
// переиспользуются из erp-sales (объект-агностичные), explicit registration
// per erp/WIRING.md §3. stockTransfer контрибьютора не имеет — ruling: БЕЗ
// проводок. TrialBalanceService/BankStatementImportService/
// BalanceSheetService/IncomeStatementService/AccountCardService/
// ReconciliationService/KudirService are exported for the MCP trial_balance/
// import_bank_statement/balance_sheet/income_statement/account_card/
// reconcile_payments/confirm_reconciliation/kudir tools (see
// api/mcp/mcp.module.ts).
@Module({
  imports: [ErpModule, TokenModule, WorkspaceCacheStorageModule],
  controllers: [
    TrialBalanceController,
    BankStatementImportController,
    FinancialStatementsController,
    AccountCardController,
    KudirController,
  ],
  providers: [
    JwtAuthGuard,
    WorkspaceAuthGuard,
    ErpDocumentGuardService,
    ErpDocumentLineGuardService,
    GlContributorsService,
    ManualEntryPostingRulesService,
    TrialBalanceService,
    BankStatementImportService,
    BalanceSheetService,
    IncomeStatementService,
    AccountCardService,
    ReconciliationService,
    KudirService,
    ...ERP_ACCOUNTING_GUARD_HOOKS,
  ],
  exports: [
    TrialBalanceService,
    BankStatementImportService,
    BalanceSheetService,
    IncomeStatementService,
    AccountCardService,
    ReconciliationService,
    KudirService,
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
