import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { GlContributorsService } from 'src/engine/core-modules/erp-accounting/services/gl-contributors.service';
import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const DOCUMENT_ID = 'document-1';
const ORGANIZATION_ID = 'organization-1';

// 1 kopeck = 10_000 micros — same scale note as trial-balance.service.spec.ts.
const kopecksToMicrosString = (kopecks: number): string =>
  String(kopecks * 10_000);

// monthCloseGlEntries resolves the glEntry table via workspaceTableReference
// (getWorkspaceContext()) — the other contributors never do, hence this
// fake context stays local to that describe block rather than the shared
// createContext() above. Same shape as trial-balance.service.spec.ts's
// buildFakeWorkspaceContext.
const buildFakeWorkspaceContext = (): ORMWorkspaceContext => {
  const universalIdentifier = 'universal-gl-entry';

  return {
    authContext: buildSystemAuthContext(WORKSPACE_ID),
    flatObjectMetadataMaps: {
      byUniversalIdentifier: {
        [universalIdentifier]: {
          id: 'object-gl-entry',
          nameSingular: 'glEntry',
          namePlural: 'glEntries',
          universalIdentifier,
          applicationUniversalIdentifier: 'erp-application',
        },
      },
      universalIdentifierById: { 'object-gl-entry': universalIdentifier },
      universalIdentifiersByApplicationId: {},
    },
    objectIdByNameSingular: { glEntry: 'object-gl-entry' },
  } as unknown as ORMWorkspaceContext;
};

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const ACCOUNT_CODES = [
  '51',
  '62.01',
  '60.01',
  '90.01.1',
  '90.02.1',
  '90.03',
  '68.02',
  '19.04',
  '26',
  '94',
  '41.01',
  '91.01',
];

const accountId = (code: string) => `account-${code}`;

const createAccountRepository = (knownCodes: string[] = ACCOUNT_CODES) => ({
  findOneBy: jest.fn(({ code }: { code: string }) =>
    Promise.resolve(knownCodes.includes(code) ? { id: accountId(code) } : null),
  ),
});

const createContext = (
  documentObjectName: string,
  repositories: Record<string, unknown> = {},
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName,
  documentId: DOCUMENT_ID,
  postingDate: '2026-08-20',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) =>
        repositories[objectName] ?? createAccountRepository(),
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const document = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: DOCUMENT_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Документ',
  ...overrides,
});

describe('GlContributorsService', () => {
  const service = new GlContributorsService();

  describe('salesInvoiceGlEntries', () => {
    // Независимая проверка ruling-чисел: счёт на 1220 ₽ при НДС 22 % «в том
    // числе» несёт 220 ₽ налога.
    it('builds Дт 62.01 Кт 90.01.1 (итог с НДС) and Дт 90.03 Кт 68.02 (НДС)', async () => {
      const context = createContext('salesInvoice');

      const rows = await service.salesInvoiceGlEntries(
        context,
        document({
          total: rubles(1220),
          vatTotal: rubles(220),
          customerId: 'company-1',
        }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('62.01'),
          creditAccountId: accountId('90.01.1'),
          amount: rubles(1220),
          partyId: 'company-1',
          organizationId: ORGANIZATION_ID,
          date: '2026-08-20',
          voucherType: 'salesInvoice',
          voucherId: DOCUMENT_ID,
          isCancelled: false,
          isCancellation: false,
        }),
        expect.objectContaining({
          debitAccountId: accountId('90.03'),
          creditAccountId: accountId('68.02'),
          amount: rubles(220),
          partyId: null,
        }),
      ]);
    });

    it('skips the VAT entry when vatTotal is zero (ставка 0 %/без НДС)', async () => {
      const rows = await service.salesInvoiceGlEntries(
        createContext('salesInvoice'),
        document({ total: rubles(1000), vatTotal: rubles(0) }),
        [],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        debitAccountId: accountId('62.01'),
        creditAccountId: accountId('90.01.1'),
      });
    });

    it('throws a RU error when an account code is missing from the chart', async () => {
      const context = createContext('salesInvoice', {
        account: createAccountRepository(['90.01.1']),
      });

      await expect(
        service.salesInvoiceGlEntries(
          context,
          document({ total: rubles(100), vatTotal: rubles(0) }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });
  });

  describe('paymentGlEntries', () => {
    it('builds Дт 51 Кт 62.01 with the document payer as party', async () => {
      const rows = await service.paymentGlEntries(
        createContext('payment'),
        document({ amount: rubles(610), payerId: 'company-1' }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('51'),
          creditAccountId: accountId('62.01'),
          amount: rubles(610),
          partyId: 'company-1',
        }),
      ]);
    });

    it('falls back to the linked invoice customer when the payer is not set', async () => {
      const context = createContext('payment', {
        salesInvoice: {
          findOneBy: jest
            .fn()
            .mockResolvedValue({ id: 'invoice-1', customerId: 'company-2' }),
        },
      });

      const rows = await service.paymentGlEntries(
        context,
        document({ amount: rubles(610), salesInvoiceId: 'invoice-1' }),
        [],
      );

      expect(rows[0]).toMatchObject({ partyId: 'company-2' });
    });
  });

  describe('supplierInvoiceGlEntries', () => {
    it('builds Дт 26 Кт 60.01 (без НДС), Дт 19.04 Кт 60.01 (НДС) and Дт 68.02 Кт 19.04 (вычет)', async () => {
      const rows = await service.supplierInvoiceGlEntries(
        createContext('supplierInvoice'),
        document({
          total: rubles(1220),
          vatTotal: rubles(220),
          supplierId: 'supplier-1',
        }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('26'),
          creditAccountId: accountId('60.01'),
          amount: rubles(1000),
          partyId: 'supplier-1',
        }),
        expect.objectContaining({
          debitAccountId: accountId('19.04'),
          creditAccountId: accountId('60.01'),
          amount: rubles(220),
          partyId: 'supplier-1',
        }),
        expect.objectContaining({
          debitAccountId: accountId('68.02'),
          creditAccountId: accountId('19.04'),
          amount: rubles(220),
          partyId: null,
        }),
      ]);
    });

    it('collapses to a single entry without VAT', async () => {
      const rows = await service.supplierInvoiceGlEntries(
        createContext('supplierInvoice'),
        document({ total: rubles(500), vatTotal: rubles(0) }),
        [],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        debitAccountId: accountId('26'),
        creditAccountId: accountId('60.01'),
        amount: rubles(500),
      });
    });
  });

  describe('supplierPaymentGlEntries', () => {
    it('builds Дт 60.01 Кт 51', async () => {
      const rows = await service.supplierPaymentGlEntries(
        createContext('supplierPayment'),
        document({ amount: rubles(305), supplierId: 'supplier-1' }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('60.01'),
          creditAccountId: accountId('51'),
          amount: rubles(305),
          partyId: 'supplier-1',
        }),
      ]);
    });
  });

  describe('goodsReceiptGlEntries', () => {
    it('builds Дт 41.01 Кт 60.01 for the document total', async () => {
      const rows = await service.goodsReceiptGlEntries(
        createContext('goodsReceipt'),
        document({ total: rubles(1000), supplierId: 'supplier-1' }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('41.01'),
          creditAccountId: accountId('60.01'),
          amount: rubles(1000),
          partyId: 'supplier-1',
        }),
      ]);
    });
  });

  describe('salesShipmentGlEntries', () => {
    it('builds Дт 90.02.1 Кт 41.01 for totalCost', async () => {
      const rows = await service.salesShipmentGlEntries(
        createContext('salesShipment'),
        document({ totalCost: rubles(400) }),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('90.02.1'),
          creditAccountId: accountId('41.01'),
          amount: rubles(400),
          partyId: null,
        }),
      ]);
    });
  });

  describe('goodsWriteOffGlEntries', () => {
    it('builds Дт 94 Кт 41.01 for Σ|stockValueDiff| of the voucher rows', async () => {
      const context = createContext('goodsWriteOff', {
        stockLedgerEntry: {
          findBy: jest
            .fn()
            .mockResolvedValue([
              { stockValueDiff: rubles(-300) },
              { stockValueDiff: rubles(-200) },
            ]),
        },
      });

      const rows = await service.goodsWriteOffGlEntries(
        context,
        document(),
        [],
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('94'),
          creditAccountId: accountId('41.01'),
          amount: rubles(500),
        }),
      ]);
      expect(
        (context.transactionScope.getRepository as jest.Mock).mock.calls,
      ).toEqual(
        expect.arrayContaining([
          ['stockLedgerEntry', { shouldBypassPermissionChecks: true }],
        ]),
      );
    });
  });

  describe('goodsPostingGlEntries', () => {
    it('builds Дт 41.01 Кт 91.01 for the posted stock value', async () => {
      const context = createContext('goodsPosting', {
        stockLedgerEntry: {
          findBy: jest
            .fn()
            .mockResolvedValue([
              { stockValueDiff: rubles(250) },
              { stockValueDiff: rubles(250) },
            ]),
        },
      });

      const rows = await service.goodsPostingGlEntries(context, document(), []);

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('41.01'),
          creditAccountId: accountId('91.01'),
          amount: rubles(500),
        }),
      ]);
    });
  });

  describe('manualEntryGlEntries', () => {
    it('maps lines as entered: accounts, amount, party and item passthrough', () => {
      const lines: ErpDocumentLineRecord[] = [
        {
          id: 'line-1',
          name: 'Хознужды',
          debitAccountId: accountId('26'),
          creditAccountId: accountId('51'),
          amount: rubles(500),
          partyId: 'company-1',
          itemId: null,
        },
        {
          id: 'line-2',
          name: '',
          debitAccountId: accountId('94'),
          creditAccountId: accountId('41.01'),
          amount: rubles(120.5),
          partyId: null,
          itemId: 'item-1',
        },
      ];

      const rows = service.manualEntryGlEntries(
        createContext('manualEntry'),
        document({ name: 'Ручная операция № ME-000001 от 20.08.2026' }),
        lines,
      );

      expect(rows).toEqual([
        expect.objectContaining({
          name: 'Хознужды',
          debitAccountId: accountId('26'),
          creditAccountId: accountId('51'),
          amount: rubles(500),
          partyId: 'company-1',
          itemId: null,
          organizationId: ORGANIZATION_ID,
          date: '2026-08-20',
          voucherType: 'manualEntry',
          voucherId: DOCUMENT_ID,
          isCancelled: false,
          isCancellation: false,
        }),
        expect.objectContaining({
          name: 'Ручная операция № ME-000001 от 20.08.2026',
          debitAccountId: accountId('94'),
          creditAccountId: accountId('41.01'),
          amount: rubles(120.5),
          partyId: null,
          itemId: 'item-1',
        }),
      ]);
    });
  });

  describe('monthCloseGlEntries', () => {
    const MONTH_CLOSE_ACCOUNT_CODES = [
      '90.01.1',
      '90.02.1',
      '90.03',
      '91.01',
      '91.02',
      '90.09',
      '91.09',
      '99',
      '84',
    ];

    const createMonthCloseAccountRepository = () => ({
      findOneBy: jest.fn(({ code }: { code: string }) =>
        Promise.resolve(
          MONTH_CLOSE_ACCOUNT_CODES.includes(code)
            ? { id: accountId(code) }
            : null,
        ),
      ),
      findBy: jest.fn().mockResolvedValue(
        MONTH_CLOSE_ACCOUNT_CODES.map((code) => ({
          id: accountId(code),
          code,
        })),
      ),
    });

    const monthCloseDocument = (
      overrides: Record<string, unknown> = {},
    ): ErpDocumentRecord =>
      document({
        period: '2026-08-01',
        isYearReformation: false,
        ...overrides,
      });

    const runMonthCloseGlEntries = (
      service: GlContributorsService,
      context: PostingContext,
      doc: ErpDocumentRecord,
    ) =>
      withWorkspaceContext(buildFakeWorkspaceContext(), () =>
        service.monthCloseGlEntries(context, doc, []),
      );

    it('builds Дт 90.09 Кт 99 for a profitable month and skips the zero 91.09 leg', async () => {
      const executeRawQuery = jest.fn().mockResolvedValue([
        {
          account_id: accountId('90.01.1'),
          debit_micros: '0',
          credit_micros: kopecksToMicrosString(100_000),
        },
        {
          account_id: accountId('90.02.1'),
          debit_micros: kopecksToMicrosString(60_000),
          credit_micros: '0',
        },
        {
          account_id: accountId('90.03'),
          debit_micros: kopecksToMicrosString(10_000),
          credit_micros: '0',
        },
      ]);
      const context = createContext('monthClose', {
        account: createMonthCloseAccountRepository(),
      });

      context.transactionScope.executeRawQuery = executeRawQuery;

      const rows = await runMonthCloseGlEntries(
        new GlContributorsService(),
        context,
        monthCloseDocument(),
      );

      expect(rows).toEqual([
        expect.objectContaining({
          debitAccountId: accountId('90.09'),
          creditAccountId: accountId('99'),
          amount: rubles(300),
          voucherType: 'monthClose',
          voucherId: DOCUMENT_ID,
        }),
      ]);
      // Not a reformation — only the monthly [period, nextMonth) window is
      // queried once, never the yearly one.
      expect(executeRawQuery).toHaveBeenCalledTimes(1);
      expect(executeRawQuery.mock.calls[0][1]).toEqual([
        ORGANIZATION_ID,
        expect.anything(),
        '2026-08-01',
        '2026-09-01',
      ]);
    });

    it('rejects a month with no gl turnover at all (нулевой месяц)', async () => {
      const context = createContext('monthClose', {
        account: createMonthCloseAccountRepository(),
      });

      context.transactionScope.executeRawQuery = jest
        .fn()
        .mockResolvedValue([]);

      await expect(
        runMonthCloseGlEntries(
          new GlContributorsService(),
          context,
          monthCloseDocument(),
        ),
      ).rejects.toThrow(/no gl turnover/);
    });

    it('реформация: queries the yearly window too and closes 99→84', async () => {
      const executeRawQuery = jest
        .fn()
        .mockImplementation((_sql: string, params: unknown[]) => {
          const dateFromInclusive = params[2];

          if (dateFromInclusive === '2026-01-01') {
            // Yearly window: 90.01.1 credit 500 000, nothing else — a clean
            // 500 000 profit for the reformation math.
            return Promise.resolve([
              {
                account_id: accountId('90.01.1'),
                debit_micros: '0',
                credit_micros: kopecksToMicrosString(500_000),
              },
            ]);
          }

          // Monthly (December-only) window: no turnover on its own — still
          // a valid close because the reformation zeroing legs carry it.
          return Promise.resolve([
            {
              account_id: accountId('90.01.1'),
              debit_micros: '0',
              credit_micros: kopecksToMicrosString(20_000),
            },
          ]);
        });
      const context = createContext('monthClose', {
        account: createMonthCloseAccountRepository(),
      });

      context.transactionScope.executeRawQuery = executeRawQuery;

      const rows = await runMonthCloseGlEntries(
        new GlContributorsService(),
        context,
        monthCloseDocument({
          period: '2026-12-01',
          isYearReformation: true,
        }),
      );

      expect(executeRawQuery).toHaveBeenCalledTimes(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            debitAccountId: accountId('90.01.1'),
            creditAccountId: accountId('90.09'),
            amount: rubles(5000),
          }),
          expect.objectContaining({
            debitAccountId: accountId('99'),
            creditAccountId: accountId('84'),
            amount: rubles(5000),
          }),
        ]),
      );
    });
  });
});
