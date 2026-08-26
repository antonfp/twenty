import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type PostingContext } from 'src/engine/core-modules/erp/types/posting.types';
import { ItemBalanceService } from 'src/engine/core-modules/erp-stock/services/item-balance.service';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ITEM_ID = 'item-1';
const WAREHOUSE_ID = 'warehouse-1';
const ITEM_NAME = 'Товар А';
const WAREHOUSE_NAME = 'Основной склад';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const rublesToMicros = (amount: number) => Math.round(amount * 1_000_000);

const balanceRow = (actualQty: number, avgCostRubles: number) => ({
  id: 'balance-1',
  actualQty,
  avgCostAmountMicros: String(rublesToMicros(avgCostRubles)),
  avgCostCurrencyCode: 'RUB',
});

const buildFakeWorkspaceContext = (): ORMWorkspaceContext => {
  const universalIdentifier = 'universal-item-balance';

  return {
    authContext: buildSystemAuthContext(WORKSPACE_ID),
    flatObjectMetadataMaps: {
      byUniversalIdentifier: {
        [universalIdentifier]: {
          id: 'object-item-balance',
          nameSingular: 'itemBalance',
          namePlural: 'itemBalances',
          universalIdentifier,
          applicationUniversalIdentifier: 'erp-application',
        },
      },
      universalIdentifierById: { 'object-item-balance': universalIdentifier },
      universalIdentifiersByApplicationId: {},
    },
    objectIdByNameSingular: { itemBalance: 'object-item-balance' },
  } as unknown as ORMWorkspaceContext;
};

const createMockRepository = () => ({
  insert: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  findBy: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
});

type MockRepository = ReturnType<typeof createMockRepository>;

describe('ItemBalanceService', () => {
  let service: ItemBalanceService;
  let executeRawQuery: jest.Mock;
  let repositories: Record<string, MockRepository>;
  let context: PostingContext;
  // Keyed by `${itemId}:${warehouseId}`, returned by the FOR UPDATE select.
  let balanceRowsByPair: Record<string, unknown[]>;

  const run = <TResult>(fn: () => Promise<TResult>): Promise<TResult> =>
    Promise.resolve(withWorkspaceContext(buildFakeWorkspaceContext(), fn));

  beforeEach(() => {
    balanceRowsByPair = {};
    executeRawQuery = jest.fn(
      async (sql: string, parameters: unknown[] = []) => {
        if (sql.includes('pg_advisory_xact_lock')) {
          return [];
        }

        return balanceRowsByPair[`${parameters[0]}:${parameters[1]}`] ?? [];
      },
    );
    repositories = {
      itemBalance: createMockRepository(),
      stockLedgerEntry: createMockRepository(),
      item: createMockRepository(),
      warehouse: createMockRepository(),
    };
    repositories.item.findOneBy.mockResolvedValue({ name: ITEM_NAME });
    repositories.warehouse.findOneBy.mockResolvedValue({
      name: WAREHOUSE_NAME,
    });
    context = {
      workspaceId: WORKSPACE_ID,
      documentObjectName: 'goodsReceipt',
      documentId: 'document-1',
      postingDate: '2026-08-25',
      transactionScope: {
        getRepository: jest.fn(
          (objectNameSingular: string) => repositories[objectNameSingular],
        ),
        executeRawQuery,
      } as unknown as WorkspaceTransactionScope,
    };
    service = new ItemBalanceService();
  });

  describe('getBalanceForUpdate', () => {
    it('takes the advisory lock, selects FOR UPDATE and returns a zero state when no row exists', async () => {
      const state = await run(() =>
        service.getBalanceForUpdate(context, {
          itemId: ITEM_ID,
          warehouseId: WAREHOUSE_ID,
        }),
      );

      const [lockSql, lockParameters] = executeRawQuery.mock.calls[0];

      expect(lockSql).toContain('pg_advisory_xact_lock');
      expect(lockParameters).toEqual([
        `erp-stock:item-balance:${ITEM_ID}:${WAREHOUSE_ID}`,
      ]);

      const [selectSql, selectParameters] = executeRawQuery.mock.calls[1];

      expect(selectSql).toContain('FOR UPDATE');
      expect(selectSql).toContain('"_itemBalance"');
      expect(selectParameters).toEqual([ITEM_ID, WAREHOUSE_ID]);

      expect(state).toEqual({
        id: null,
        actualQty: 0,
        avgCostMicros: 0,
        currencyCode: 'RUB',
      });
    });

    it('parses an existing row (bigint columns arrive as strings)', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(20, 150)];

      const state = await run(() =>
        service.getBalanceForUpdate(context, {
          itemId: ITEM_ID,
          warehouseId: WAREHOUSE_ID,
        }),
      );

      expect(state).toEqual({
        id: 'balance-1',
        actualQty: 20,
        avgCostMicros: rublesToMicros(150),
        currencyCode: 'RUB',
      });
    });
  });

  describe('applyReceipt', () => {
    it('creates the balance row on first receipt (10 pcs × 100 ₽ → avg 100 ₽)', async () => {
      const result = await run(() =>
        service.applyReceipt(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          10,
          100_000,
          'RUB',
        ),
      );

      expect(result).toEqual({
        qtyAfter: 10,
        avgCostMicros: rublesToMicros(100),
      });
      expect(repositories.itemBalance.insert).toHaveBeenCalledWith({
        name: `${ITEM_NAME} — ${WAREHOUSE_NAME}`,
        itemId: ITEM_ID,
        warehouseId: WAREHOUSE_ID,
        actualQty: 10,
        avgCost: rubles(100),
        createdBy: { source: 'SYSTEM', name: 'ERPilot', context: {} },
        updatedBy: { source: 'SYSTEM', name: 'ERPilot', context: {} },
      });
    });

    it('recomputes the moving average: 10×100 ₽ then 10×200 ₽ → avg 150 ₽', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(10, 100)];

      const result = await run(() =>
        service.applyReceipt(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          10,
          200_000,
          'RUB',
        ),
      );

      expect(result).toEqual({
        qtyAfter: 20,
        avgCostMicros: rublesToMicros(150),
      });
      expect(repositories.itemBalance.update).toHaveBeenCalledWith(
        'balance-1',
        { actualQty: 20, avgCost: rubles(150) },
      );
    });
  });

  describe('applyIssue', () => {
    it('issues at the moving average without changing it', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(20, 150)];

      const result = await run(() =>
        service.applyIssue(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          5,
        ),
      );

      expect(result).toEqual({
        qtyAfter: 15,
        costKopecks: 75_000,
        avgCostMicros: rublesToMicros(150),
        currencyCode: 'RUB',
      });
      expect(repositories.itemBalance.update).toHaveBeenCalledWith(
        'balance-1',
        { actualQty: 15, avgCost: rubles(150) },
      );
    });

    it('rounds the issue cost half away from zero to kopecks', async () => {
      // avg 0.333333 ₽/unit: 1 unit → 33.3333 kopecks → 33; 3 units → 99.9999 → 100.
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [
        balanceRow(10, 0.333333),
      ];

      const singleUnit = await run(() =>
        service.applyIssue(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          1,
        ),
      );

      expect(singleUnit.costKopecks).toBe(33);

      const threeUnits = await run(() =>
        service.applyIssue(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          3,
        ),
      );

      expect(threeUnits.costKopecks).toBe(100);
    });

    it('throws a Russian insufficient-stock error with item and warehouse names', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(5, 100)];

      const issue = run(() =>
        service.applyIssue(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          8,
        ),
      );

      await expect(issue).rejects.toThrow(ErpPostingException);
      await expect(
        run(() =>
          service.applyIssue(
            context,
            { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
            8,
          ),
        ),
      ).rejects.toThrow('available 5, required 8');

      expect(repositories.item.findOneBy).toHaveBeenCalledWith({
        id: ITEM_ID,
      });
      expect(repositories.warehouse.findOneBy).toHaveBeenCalledWith({
        id: WAREHOUSE_ID,
      });
      expect(repositories.itemBalance.update).not.toHaveBeenCalled();
    });

    it('absorbs float noise when issuing the whole balance', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [
        { ...balanceRow(0, 100), actualQty: 0.1 + 0.2 },
      ];

      const result = await run(() =>
        service.applyIssue(
          context,
          { itemId: ITEM_ID, warehouseId: WAREHOUSE_ID },
          0.3,
        ),
      );

      expect(result.qtyAfter).toBe(0);
    });
  });

  describe('cancelBalanceEffects', () => {
    const ledgerRow = (overrides: Record<string, unknown>) => ({
      id: 'ledger-1',
      itemId: ITEM_ID,
      warehouseId: WAREHOUSE_ID,
      actualQty: 10,
      stockValueDiff: rubles(1000),
      isCancellation: false,
      ...overrides,
    });

    beforeEach(() => {
      repositories.stockLedgerEntry.findBy.mockImplementation(
        async (filter: Record<string, unknown>) =>
          filter.isCancellation === true
            ? [{ id: 'reversal-1' }]
            : [ledgerRow({})],
      );
    });

    it('rolls a receipt back and restamps reversal rows with the post-cancel qty', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(25, 100)];

      await run(() => service.cancelBalanceEffects(context));

      expect(repositories.itemBalance.update).toHaveBeenCalledWith(
        'balance-1',
        { actualQty: 15, avgCost: rubles(100) },
      );
      expect(repositories.stockLedgerEntry.update).toHaveBeenCalledWith(
        ['reversal-1'],
        { qtyAfter: 15 },
      );
    });

    it('blocks the cancel when the reversal would drive the balance negative', async () => {
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(5, 100)];

      await expect(
        run(() => service.cancelBalanceEffects(context)),
      ).rejects.toThrow('available 5, required 10');
      expect(repositories.itemBalance.update).not.toHaveBeenCalled();
    });

    it('restores an issued quantity at its original cost (costAmount), shifting the average', async () => {
      repositories.stockLedgerEntry.findBy.mockImplementation(
        async (filter: Record<string, unknown>) =>
          filter.isCancellation === true
            ? [{ id: 'reversal-1' }]
            : [ledgerRow({ actualQty: -4, stockValueDiff: rubles(-600) })],
      );
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(6, 100)];

      await run(() => service.cancelBalanceEffects(context));

      // (6×100 ₽ + 600 ₽) / 10 = 120 ₽
      expect(repositories.itemBalance.update).toHaveBeenCalledWith(
        'balance-1',
        { actualQty: 10, avgCost: rubles(120) },
      );
    });

    it('reverses several lines of the same item×warehouse as one delta', async () => {
      repositories.stockLedgerEntry.findBy.mockImplementation(
        async (filter: Record<string, unknown>) =>
          filter.isCancellation === true
            ? [{ id: 'reversal-1' }, { id: 'reversal-2' }]
            : [
                ledgerRow({ actualQty: 5, stockValueDiff: rubles(500) }),
                ledgerRow({
                  id: 'ledger-2',
                  actualQty: 5,
                  stockValueDiff: rubles(1500),
                }),
              ],
      );
      balanceRowsByPair[`${ITEM_ID}:${WAREHOUSE_ID}`] = [balanceRow(10, 200)];

      await run(() => service.cancelBalanceEffects(context));

      // Full rollback to zero keeps the average as informational.
      expect(repositories.itemBalance.update).toHaveBeenCalledTimes(1);
      expect(repositories.itemBalance.update).toHaveBeenCalledWith(
        'balance-1',
        { actualQty: 0, avgCost: rubles(200) },
      );
      expect(repositories.stockLedgerEntry.update).toHaveBeenCalledWith(
        ['reversal-1', 'reversal-2'],
        { qtyAfter: 0 },
      );
    });

    it('throws when a ledger row lost its item or warehouse reference', async () => {
      repositories.stockLedgerEntry.findBy.mockResolvedValue([
        ledgerRow({ itemId: null }),
      ]);

      await expect(
        run(() => service.cancelBalanceEffects(context)),
      ).rejects.toThrow(ErpPostingException);
    });
  });
});
