import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { GoodsWriteOffPostingRulesService } from 'src/engine/core-modules/erp-stock/services/goods-write-off-posting-rules.service';
import { type ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const WRITE_OFF_ID = 'goods-write-off-1';
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
  documentObjectName: 'goodsWriteOff',
  documentId: WRITE_OFF_ID,
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
    nextDocumentNumber: jest.fn().mockResolvedValue('WO-000004'),
  };
  const itemBalanceService = {
    applyIssue: jest.fn(),
    cancelBalanceEffects: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new GoodsWriteOffPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
      itemBalanceService as unknown as ItemBalanceService,
    ),
    itemBalanceService,
  };
};

const writeOff = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: WRITE_OFF_ID,
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
  quantity: 2,
  ...overrides,
});

describe('GoodsWriteOffPostingRulesService', () => {
  it('rejects a write-off without a warehouse', () => {
    const { service } = createService();

    expect(() =>
      service.validate(createContext(), writeOff({ warehouseId: null }), [
        line(),
      ]),
    ).toThrow(ErpPostingException);
  });

  it('issues at the moving average and numbers the document', async () => {
    const repositories = { goodsWriteOff: createMockRepository() };
    const { service, itemBalanceService } = createService();

    itemBalanceService.applyIssue.mockResolvedValue({
      qtyAfter: 8,
      costKopecks: 30_000,
      avgCostMicros: 150_000_000,
      currencyCode: 'RUB',
    });

    const context = createContext(repositories);

    const entries = (await service.getStockEntries(context, writeOff(), [
      line(),
    ])) as unknown as ErpStockLedgerEntryRow[];

    expect(itemBalanceService.applyIssue).toHaveBeenCalledWith(
      context,
      { itemId: 'item-1', warehouseId: WAREHOUSE_ID },
      2,
    );
    expect(repositories.goodsWriteOff.update).toHaveBeenCalledWith(
      WRITE_OFF_ID,
      {
        number: 'WO-000004',
        name: 'Списание № WO-000004 от 25.08.2026',
      },
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      name: 'Списание № WO-000004 от 25.08.2026',
      itemId: 'item-1',
      warehouseId: WAREHOUSE_ID,
      organizationId: 'organization-1',
      actualQty: -2,
      qtyAfter: 8,
      valuationRate: rubles(150),
      stockValueDiff: rubles(-300),
      voucherType: 'goodsWriteOff',
      voucherId: WRITE_OFF_ID,
      isCancelled: false,
      isCancellation: false,
    });
  });

  it('rolls balances back through cancelBalanceEffects on cancel', async () => {
    const { service, itemBalanceService } = createService();
    const context = createContext();

    await service.onCancel(context, writeOff());

    expect(itemBalanceService.cancelBalanceEffects).toHaveBeenCalledWith(
      context,
    );
  });
});
