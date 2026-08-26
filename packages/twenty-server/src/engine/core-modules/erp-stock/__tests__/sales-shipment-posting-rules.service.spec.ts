import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { type ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { SalesShipmentPostingRulesService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-posting-rules.service';
import { type ErpStockLedgerEntryRow } from 'src/engine/core-modules/erp-stock/types/erp-stock.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const SHIPMENT_ID = 'sales-shipment-1';
const WAREHOUSE_ID = 'warehouse-1';
const INVOICE_ID = 'sales-invoice-1';

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
  documentObjectName: 'salesShipment',
  documentId: SHIPMENT_ID,
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
    nextDocumentNumber: jest.fn().mockResolvedValue('SH-000007'),
  };
  const itemBalanceService = {
    applyIssue: jest.fn(),
    cancelBalanceEffects: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new SalesShipmentPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
      itemBalanceService as unknown as ItemBalanceService,
    ),
    itemBalanceService,
  };
};

const shipment = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: SHIPMENT_ID,
  warehouseId: WAREHOUSE_ID,
  organizationId: 'organization-1',
  salesInvoiceId: null,
  number: null,
  ...overrides,
});

const line = (
  overrides: Record<string, unknown> = {},
): ErpDocumentLineRecord => ({
  id: 'line-1',
  itemId: 'item-1',
  quantity: 5,
  price: rubles(250),
  costAmount: null,
  ...overrides,
});

describe('SalesShipmentPostingRulesService', () => {
  describe('validate', () => {
    it('accepts a shipment without a linked invoice', async () => {
      const { service } = createService();

      await expect(
        service.validate(createContext(), shipment(), [line()]),
      ).resolves.toBeUndefined();
    });

    it('rejects a shipment whose linked invoice does not exist', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.validate(
          createContext(repositories),
          shipment({ salesInvoiceId: INVOICE_ID }),
          [line()],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a shipment whose linked invoice is not POSTED', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue({
        id: INVOICE_ID,
        docStatus: 'DRAFT',
      });
      const { service } = createService();

      await expect(
        service.validate(
          createContext(repositories),
          shipment({ salesInvoiceId: INVOICE_ID }),
          [line()],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('accepts a shipment linked to a POSTED invoice', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue({
        id: INVOICE_ID,
        docStatus: 'POSTED',
      });
      const { service } = createService();

      await expect(
        service.validate(
          createContext(repositories),
          shipment({ salesInvoiceId: INVOICE_ID }),
          [line()],
        ),
      ).resolves.toBeUndefined();
    });

    it('rejects non-positive quantities', async () => {
      const { service } = createService();

      await expect(
        service.validate(createContext(), shipment(), [line({ quantity: -1 })]),
      ).rejects.toThrow(ErpPostingException);
    });
  });

  describe('getStockEntries', () => {
    it('issues at the moving average, fills costAmount and totalCost', async () => {
      const repositories = {
        salesShipment: createMockRepository(),
        salesShipmentLine: createMockRepository(),
      };
      const { service, itemBalanceService } = createService();

      itemBalanceService.applyIssue
        .mockResolvedValueOnce({
          qtyAfter: 15,
          costKopecks: 75_000,
          avgCostMicros: 150_000_000,
          currencyCode: 'RUB',
        })
        .mockResolvedValueOnce({
          qtyAfter: 12,
          costKopecks: 45_000,
          avgCostMicros: 150_000_000,
          currencyCode: 'RUB',
        });

      const context = createContext(repositories);
      const lines = [line(), line({ id: 'line-2', quantity: 3 })];

      const entries = (await service.getStockEntries(
        context,
        shipment(),
        lines,
      )) as unknown as ErpStockLedgerEntryRow[];

      expect(itemBalanceService.applyIssue).toHaveBeenNthCalledWith(
        1,
        context,
        { itemId: 'item-1', warehouseId: WAREHOUSE_ID },
        5,
      );

      expect(repositories.salesShipmentLine.update).toHaveBeenCalledWith(
        'line-1',
        { costAmount: rubles(750) },
      );
      expect(repositories.salesShipment.update).toHaveBeenCalledWith(
        SHIPMENT_ID,
        {
          number: 'SH-000007',
          name: 'Реализация № SH-000007 от 25.08.2026',
          totalCost: rubles(1200),
        },
      );

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        name: 'Реализация № SH-000007 от 25.08.2026',
        itemId: 'item-1',
        warehouseId: WAREHOUSE_ID,
        organizationId: 'organization-1',
        actualQty: -5,
        qtyAfter: 15,
        valuationRate: rubles(150),
        stockValueDiff: rubles(-750),
        voucherType: 'salesShipment',
        voucherId: SHIPMENT_ID,
        isCancelled: false,
        isCancellation: false,
      });
      expect(entries[1]).toMatchObject({
        actualQty: -3,
        qtyAfter: 12,
        stockValueDiff: rubles(-450),
      });
    });
  });

  describe('onCancel', () => {
    it('rolls balances back through cancelBalanceEffects', async () => {
      const { service, itemBalanceService } = createService();
      const context = createContext();

      await service.onCancel(context, shipment());

      expect(itemBalanceService.cancelBalanceEffects).toHaveBeenCalledWith(
        context,
      );
    });
  });
});
