import { Module, type OnModuleInit } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { ErpModule } from 'src/engine/core-modules/erp/erp.module';
import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { ErpDocumentGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-guard.service';
import { ErpDocumentLineGuardService } from 'src/engine/core-modules/erp-sales/services/erp-document-line-guard.service';
import { SalesShipmentPrintController } from 'src/engine/core-modules/erp-stock/controllers/sales-shipment-print.controller';
import { ERP_STOCK_GUARD_HOOKS } from 'src/engine/core-modules/erp-stock/query-hooks/erp-stock-guard.pre-query.hooks';
import { GoodsPostingPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-posting-posting-rules.service';
import { GoodsReceiptPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-receipt-posting-rules.service';
import { GoodsWriteOffPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-write-off-posting-rules.service';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { SalesShipmentPostingRulesService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-posting-rules.service';
import { SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { StockTransferPostingRulesService } from 'src/engine/core-modules/erp-stock/services/stock-transfer-posting-rules.service';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

// Блок «Склад»: проведение пяти товарных документов, скользящая средняя
// себестоимость (ItemBalanceService), guard-хуки на документы, строки и
// регистры stockLedgerEntry/itemBalance, печатная форма УПД по реализации.
// Guard-сервисы и фабрики хуков переиспользуются из erp-sales. Explicit
// registration per erp/WIRING.md §3.
@Module({
  imports: [ErpModule, TokenModule, WorkspaceCacheStorageModule],
  controllers: [SalesShipmentPrintController],
  providers: [
    JwtAuthGuard,
    WorkspaceAuthGuard,
    ErpDocumentGuardService,
    ErpDocumentLineGuardService,
    ItemBalanceService,
    GoodsReceiptPostingRulesService,
    GoodsPostingPostingRulesService,
    SalesShipmentPostingRulesService,
    StockTransferPostingRulesService,
    GoodsWriteOffPostingRulesService,
    SalesShipmentPrintService,
    ...ERP_STOCK_GUARD_HOOKS,
  ],
})
export class ErpStockModule implements OnModuleInit {
  constructor(
    private readonly postingRulesRegistry: PostingRulesRegistry,
    private readonly goodsReceiptPostingRulesService: GoodsReceiptPostingRulesService,
    private readonly goodsPostingPostingRulesService: GoodsPostingPostingRulesService,
    private readonly salesShipmentPostingRulesService: SalesShipmentPostingRulesService,
    private readonly stockTransferPostingRulesService: StockTransferPostingRulesService,
    private readonly goodsWriteOffPostingRulesService: GoodsWriteOffPostingRulesService,
  ) {}

  onModuleInit(): void {
    this.postingRulesRegistry.registerPostingRules(
      'goodsReceipt',
      this.goodsReceiptPostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'goodsPosting',
      this.goodsPostingPostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'salesShipment',
      this.salesShipmentPostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'stockTransfer',
      this.stockTransferPostingRulesService,
    );
    this.postingRulesRegistry.registerPostingRules(
      'goodsWriteOff',
      this.goodsWriteOffPostingRulesService,
    );
  }
}
