import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { StockTransferPostingRulesService } from 'src/engine/core-modules/erp-stock/services/stock-transfer-posting-rules.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const TRANSFER_ID = 'stock-transfer-1';
const WAREHOUSE_FROM_ID = 'warehouse-from';
const WAREHOUSE_TO_ID = 'warehouse-to';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const createMockRepository = () => ({
  update: jest.fn().mockResolvedValue(undefined),
  findOneBy: jest.fn(),
});

type MockRepository = ReturnType<typeof createMockRepository>;

const createContext = (
  repositories: Record<string, MockRepository> = {},
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName: 'stockTransfer',
  documentId: TRANSFER_ID,
  postingDate: '2026-08-25',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) => repositories[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const createService = () => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue('TR-000002'),
  };
  const itemBalanceService = {
    applyIssue: jest.fn(),
    applyReceipt: jest.fn(),
    cancelBalanceEffects: jest.fn().mockResolvedValue(undefined),
    lockPairsInOrder: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new StockTransferPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
      itemBalanceService as unknown as ItemBalanceService,
    ),
    itemBalanceService,
  };
};

const transfer = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: TRANSFER_ID,
  warehouseFromId: WAREHOUSE_FROM_ID,
  warehouseToId: WAREHOUSE_TO_ID,
  organizationId: 'organization-1',
  number: null,
  ...overrides,
});

const line = (
  overrides: Record<string, unknown> = {},
): ErpDocumentLineRecord => ({
  id: 'line-1',
  itemId: 'item-1',
  quantity: 5,
  ...overrides,
});

describe('StockTransferPostingRulesService', () => {
  describe('validate', () => {
    it('rejects identical source and target warehouses', () => {
      const { service } = createService();

      expect(() =>
        service.validate(
          createContext(),
          transfer({ warehouseToId: WAREHOUSE_FROM_ID }),
          [line()],
        ),
      ).toThrow(ErpPostingException);
    });

    it.each([
      ['missing source warehouse', transfer({ warehouseFromId: null })],
      ['missing target warehouse', transfer({ warehouseToId: null })],
    ])('rejects a transfer with %s', (_label, document) => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext(), document, [line()]),
      ).toThrow(ErpPostingException);
    });

    it('accepts a valid transfer', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext(), transfer(), [line()]),
      ).not.toThrow();
    });
  });

  describe('getStockEntries', () => {
    it('issues from the source and receives into the target at the same value', async () => {
      const repositories = { stockTransfer: createMockRepository() };
      const { service, itemBalanceService } = createService();

      itemBalanceService.applyIssue.mockResolvedValue({
        qtyAfter: 7,
        costKopecks: 50_000,
        avgCostMicros: 100_000_000,
        currencyCode: 'RUB',
      });
      itemBalanceService.applyReceipt.mockResolvedValue({
        qtyAfter: 5,
        avgCostMicros: 100_000_000,
      });

      const context = createContext(repositories);

      const entries = (await service.getStockEntries(context, transfer(), [
        line(),
      ])) as unknown as ErpStockLedgerEntryRow[];

      expect(itemBalanceService.applyIssue).toHaveBeenCalledWith(
        context,
        { itemId: 'item-1', warehouseId: WAREHOUSE_FROM_ID },
        5,
      );
      // The target receives exactly the issued value — 50 000 kopecks.
      expect(itemBalanceService.applyReceipt).toHaveBeenCalledWith(
        context,
        { itemId: 'item-1', warehouseId: WAREHOUSE_TO_ID },
        5,
        50_000,
        'RUB',
      );

      expect(repositories.stockTransfer.update).toHaveBeenCalledWith(
        TRANSFER_ID,
        {
          number: 'TR-000002',
          name: 'Перемещение № TR-000002 от 25.08.2026',
        },
      );

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        name: 'Перемещение № TR-000002 от 25.08.2026',
        itemId: 'item-1',
        warehouseId: WAREHOUSE_FROM_ID,
        organizationId: 'organization-1',
        actualQty: -5,
        qtyAfter: 7,
        valuationRate: rubles(100),
        stockValueDiff: rubles(-500),
        voucherType: 'stockTransfer',
        voucherId: TRANSFER_ID,
        isCancelled: false,
        isCancellation: false,
      });
      expect(entries[1]).toEqual({
        name: 'Перемещение № TR-000002 от 25.08.2026',
        itemId: 'item-1',
        warehouseId: WAREHOUSE_TO_ID,
        organizationId: 'organization-1',
        actualQty: 5,
        qtyAfter: 5,
        valuationRate: rubles(100),
        stockValueDiff: rubles(500),
        voucherType: 'stockTransfer',
        voucherId: TRANSFER_ID,
        isCancelled: false,
        isCancellation: false,
      });
    });
  });

  describe('onCancel', () => {
    it('rolls both warehouses back through cancelBalanceEffects', async () => {
      const { service, itemBalanceService } = createService();
      const context = createContext();

      await service.onCancel(context, transfer());

      expect(itemBalanceService.cancelBalanceEffects).toHaveBeenCalledWith(
        context,
      );
    });
  });
});
