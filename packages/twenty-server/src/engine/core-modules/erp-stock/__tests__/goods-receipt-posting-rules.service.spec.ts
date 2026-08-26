import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { GoodsPostingPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-posting-posting-rules.service';
import { GoodsReceiptPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-receipt-posting-rules.service';
import { type ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const RECEIPT_ID = 'goods-receipt-1';
const WAREHOUSE_ID = 'warehouse-1';

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
  documentObjectName: 'goodsReceipt',
  documentId: RECEIPT_ID,
  postingDate: '2026-08-25',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) => repositories[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const createItemBalanceServiceMock = () => ({
  applyReceipt: jest.fn(),
  applyIssue: jest.fn(),
  cancelBalanceEffects: jest.fn().mockResolvedValue(undefined),
});

const createService = (documentNumber = 'GR-000007') => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue(documentNumber),
  };
  const itemBalanceService = createItemBalanceServiceMock();

  return {
    service: new GoodsReceiptPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
      itemBalanceService as unknown as ItemBalanceService,
    ),
    documentNumberingService,
    itemBalanceService,
  };
};

const receipt = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: RECEIPT_ID,
  warehouseId: WAREHOUSE_ID,
  organizationId: 'organization-1',
  number: null,
  ...overrides,
});

const line = (
  overrides: Record<string, unknown> = {},
): ErpDocumentLineRecord => ({
  id: 'line-1',
  itemId: 'item-1',
  quantity: 10,
  price: rubles(100),
  amount: null,
  ...overrides,
});

describe('GoodsReceiptPostingRulesService', () => {
  describe('validate', () => {
    it.each([
      ['no lines', receipt(), []],
      ['non-positive quantity', receipt(), [line({ quantity: 0 })]],
      ['negative price', receipt(), [line({ price: rubles(-1) })]],
      ['missing item', receipt(), [line({ itemId: null })]],
      ['missing warehouse', receipt({ warehouseId: null }), [line()]],
    ])(
      'rejects a document with %s',
      (_label, document, lines: ErpDocumentLineRecord[]) => {
        const { service } = createService();

        expect(() =>
          service.validate(createContext(), document, lines),
        ).toThrow(ErpPostingException);
      },
    );

    it('accepts a valid document', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext(), receipt(), [line()]),
      ).not.toThrow();
    });
  });

  describe('getStockEntries', () => {
    it('computes line amounts, totals, numbering and +qty movements', async () => {
      const repositories = {
        goodsReceipt: createMockRepository(),
        goodsReceiptLine: createMockRepository(),
      };
      const { service, itemBalanceService } = createService();

      itemBalanceService.applyReceipt
        .mockResolvedValueOnce({ qtyAfter: 10, avgCostMicros: 100_000_000 })
        .mockResolvedValueOnce({ qtyAfter: 20, avgCostMicros: 150_000_000 });

      const context = createContext(repositories);
      const lines = [
        line(),
        line({ id: 'line-2', price: rubles(200), amount: rubles(2000) }),
      ];

      const entries = (await service.getStockEntries(
        context,
        receipt(),
        lines,
      )) as unknown as ErpStockLedgerEntryRow[];

      // 10 × 100 ₽ = 100 000 kopecks; 10 × 200 ₽ = 200 000 kopecks.
      expect(itemBalanceService.applyReceipt).toHaveBeenNthCalledWith(
        1,
        context,
        { itemId: 'item-1', warehouseId: WAREHOUSE_ID },
        10,
        100_000,
        'RUB',
      );
      expect(itemBalanceService.applyReceipt).toHaveBeenNthCalledWith(
        2,
        context,
        { itemId: 'item-1', warehouseId: WAREHOUSE_ID },
        10,
        200_000,
        'RUB',
      );

      // line-2 already carries the correct amount — only line-1 is updated.
      expect(repositories.goodsReceiptLine.update).toHaveBeenCalledTimes(1);
      expect(repositories.goodsReceiptLine.update).toHaveBeenCalledWith(
        'line-1',
        { amount: rubles(1000) },
      );

      expect(repositories.goodsReceipt.update).toHaveBeenCalledWith(
        RECEIPT_ID,
        {
          number: 'GR-000007',
          name: 'Поступление № GR-000007 от 25.08.2026',
          total: rubles(3000),
        },
      );

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        name: 'Поступление № GR-000007 от 25.08.2026',
        itemId: 'item-1',
        warehouseId: WAREHOUSE_ID,
        organizationId: 'organization-1',
        actualQty: 10,
        qtyAfter: 10,
        valuationRate: rubles(100),
        stockValueDiff: rubles(1000),
        voucherType: 'goodsReceipt',
        voucherId: RECEIPT_ID,
        isCancelled: false,
        isCancellation: false,
      });
      expect(entries[1]).toMatchObject({
        qtyAfter: 20,
        valuationRate: rubles(200),
        stockValueDiff: rubles(2000),
      });
    });

    it('keeps an existing document number', async () => {
      const repositories = {
        goodsReceipt: createMockRepository(),
        goodsReceiptLine: createMockRepository(),
      };
      const { service, itemBalanceService, documentNumberingService } =
        createService();

      itemBalanceService.applyReceipt.mockResolvedValue({
        qtyAfter: 10,
        avgCostMicros: 100_000_000,
      });

      await service.getStockEntries(
        createContext(repositories),
        receipt({ number: 'GR-000001' }),
        [line()],
      );

      expect(
        documentNumberingService.nextDocumentNumber,
      ).not.toHaveBeenCalled();
      expect(repositories.goodsReceipt.update).toHaveBeenCalledWith(
        RECEIPT_ID,
        expect.objectContaining({ number: 'GR-000001' }),
      );
    });
  });

  describe('onCancel', () => {
    it('rolls balances back through cancelBalanceEffects', async () => {
      const { service, itemBalanceService } = createService();
      const context = createContext();

      await service.onCancel(context, receipt());

      expect(itemBalanceService.cancelBalanceEffects).toHaveBeenCalledWith(
        context,
      );
    });
  });
});

describe('GoodsPostingPostingRulesService', () => {
  it('posts as an inflow without a document total (goodsPosting has no total field)', async () => {
    const repositories = {
      goodsPosting: createMockRepository(),
      goodsPostingLine: createMockRepository(),
    };
    const documentNumberingService = {
      nextDocumentNumber: jest.fn().mockResolvedValue('GP-000003'),
    };
    const itemBalanceService = createItemBalanceServiceMock();

    itemBalanceService.applyReceipt.mockResolvedValue({
      qtyAfter: 10,
      avgCostMicros: 100_000_000,
    });

    const service = new GoodsPostingPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
      itemBalanceService as unknown as ItemBalanceService,
    );
    const context = {
      ...createContext(repositories),
      documentObjectName: 'goodsPosting',
    };

    const entries = (await service.getStockEntries(context, receipt(), [
      line(),
    ])) as unknown as ErpStockLedgerEntryRow[];

    expect(repositories.goodsPosting.update).toHaveBeenCalledWith(RECEIPT_ID, {
      number: 'GP-000003',
      name: 'Оприходование № GP-000003 от 25.08.2026',
    });
    expect(entries[0]).toMatchObject({ voucherType: 'goodsPosting' });
  });
});
