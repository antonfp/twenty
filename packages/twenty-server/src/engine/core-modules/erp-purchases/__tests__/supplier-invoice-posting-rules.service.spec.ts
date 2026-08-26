import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { SupplierInvoicePostingRulesService } from 'src/engine/core-modules/erp-purchases/services/supplier-invoice-posting-rules.service';
import { type ErpPartyLedgerEntryRow } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const INVOICE_ID = 'supplier-invoice-1';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const createMockRepository = () => ({
  update: jest.fn().mockResolvedValue(undefined),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
  findOne: jest.fn(),
});

type MockRepository = ReturnType<typeof createMockRepository>;

const createContext = (
  repositories: Record<string, MockRepository>,
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName: 'supplierInvoice',
  documentId: INVOICE_ID,
  postingDate: '2026-08-25',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) => repositories[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const createService = (nextNumber = 'PI-000001') => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue(nextNumber),
  };

  return {
    service: new SupplierInvoicePostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const invoice = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: INVOICE_ID,
  supplierId: 'supplier-1',
  organizationId: 'organization-1',
  number: null,
  ...overrides,
});

describe('SupplierInvoicePostingRulesService', () => {
  describe('validate', () => {
    it('rejects an invoice without lines', () => {
      const { service } = createService();

      expect(() => service.validate(createContext({}), invoice(), [])).toThrow(
        ErpPostingException,
      );
    });

    it('rejects a line with non-positive quantity', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext({}), invoice(), [
          { id: 'line-1', quantity: 0, price: rubles(100) },
        ]),
      ).toThrow(ErpPostingException);
    });

    it('rejects a line with negative price', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext({}), invoice(), [
          { id: 'line-1', quantity: 1, price: rubles(-1) },
        ]),
      ).toThrow(ErpPostingException);
    });

    it('accepts a zero-price line', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext({}), invoice(), [
          { id: 'line-1', quantity: 1, price: null },
        ]),
      ).not.toThrow();
    });
  });

  describe('getPartyEntries', () => {
    it('recomputes totals with VAT-in-price, updates the invoice and returns one -total entry', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierInvoiceLine: createMockRepository(),
      };
      const context = createContext(repositories);
      const { service, documentNumberingService } = createService();

      const lines = [
        {
          id: 'line-1',
          quantity: 10,
          price: rubles(3600),
          vatRate: 'VAT_20',
          amount: null,
        },
        {
          id: 'line-2',
          quantity: 3,
          price: rubles(33.34),
          vatRate: 'NO_VAT',
          amount: rubles(100.02),
        },
      ];

      const entries = (await service.getPartyEntries(
        context,
        invoice(),
        lines,
      )) as unknown as ErpPartyLedgerEntryRow[];

      // 36 000,00 + 100,02 = 36 100,02; НДС 20/120 от 36 000,00 = 6 000,00
      expect(repositories.supplierInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          number: 'PI-000001',
          name: 'Счёт поставщика № PI-000001 от 25.08.2026',
          total: rubles(36100.02),
          vatTotal: rubles(6000),
        },
      );

      // line-1 amount was empty and gets written; line-2 already matches
      expect(repositories.supplierInvoiceLine.update).toHaveBeenCalledTimes(1);
      expect(repositories.supplierInvoiceLine.update).toHaveBeenCalledWith(
        'line-1',
        { amount: rubles(36000) },
      );

      expect(documentNumberingService.nextDocumentNumber).toHaveBeenCalledWith(
        expect.objectContaining({ docType: 'supplierInvoice', prefix: 'PI' }),
      );

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        name: 'Счёт поставщика № PI-000001 от 25.08.2026',
        companyId: 'supplier-1',
        organizationId: 'organization-1',
        voucherType: 'supplierInvoice',
        voucherId: INVOICE_ID,
        amount: rubles(-36100.02),
        postingDate: '2026-08-25',
        isCancelled: false,
        isCancellation: false,
      });
    });

    it('rounds VAT and line amounts to kopecks half away from zero', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierInvoiceLine: createMockRepository(),
      };
      const context = createContext(repositories);
      const { service } = createService();

      const entries = (await service.getPartyEntries(context, invoice(), [
        // 0,05 × 1 → НДС 20/120 от 5 коп = 0,83 коп → 1 коп
        { id: 'line-1', quantity: 1, price: rubles(0.05), vatRate: 'VAT_20' },
        // 0,5 × 0,03 = 1,5 коп → 2 коп; НДС 2×20/120 = 0,33 коп → 0 коп
        { id: 'line-2', quantity: 0.5, price: rubles(0.03), vatRate: 'VAT_20' },
      ])) as unknown as ErpPartyLedgerEntryRow[];

      expect(repositories.supplierInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        expect.objectContaining({
          total: rubles(0.07),
          vatTotal: rubles(0.01),
        }),
      );
      expect(entries[0].amount).toEqual(rubles(-0.07));
    });

    it('keeps an existing document number and skips numbering', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierInvoiceLine: createMockRepository(),
      };
      const context = createContext(repositories);
      const { service, documentNumberingService } = createService();

      await service.getPartyEntries(context, invoice({ number: '42' }), [
        { id: 'line-1', quantity: 1, price: rubles(100), vatRate: 'NO_VAT' },
      ]);

      expect(
        documentNumberingService.nextDocumentNumber,
      ).not.toHaveBeenCalled();
      expect(repositories.supplierInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        expect.objectContaining({
          number: '42',
          name: 'Счёт поставщика № 42 от 25.08.2026',
        }),
      );
    });
  });

  describe('onCancel', () => {
    const createRepositories = () => ({
      supplierPayment: createMockRepository(),
      goodsReceipt: createMockRepository(),
    });

    it('allows cancelling an invoice with no payments and no receipts', async () => {
      const repositories = createRepositories();

      repositories.supplierPayment.findOne.mockResolvedValue(null);
      repositories.goodsReceipt.findOne.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).resolves.toBeUndefined();
      expect(repositories.supplierPayment.findOne).toHaveBeenCalledWith({
        where: { supplierInvoiceId: INVOICE_ID, docStatus: 'POSTED' },
        withDeleted: true,
      });
      expect(repositories.goodsReceipt.findOne).toHaveBeenCalledWith({
        where: { supplierInvoiceId: INVOICE_ID, docStatus: 'POSTED' },
        withDeleted: true,
      });
    });

    it('allows cancelling an invoice whose only payment is cancelled', async () => {
      const repositories = createRepositories();

      // The docStatus:POSTED filter itself excludes a CANCELLED payment;
      // simulated here by the mock returning no match.
      repositories.supplierPayment.findOne.mockResolvedValue(null);
      repositories.goodsReceipt.findOne.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).resolves.toBeUndefined();
    });

    it('blocks cancelling an invoice with a posted payment still linked', async () => {
      const repositories = createRepositories();

      repositories.supplierPayment.findOne.mockResolvedValue({
        id: 'supplier-payment-1',
        supplierInvoiceId: INVOICE_ID,
        docStatus: 'POSTED',
      });
      repositories.goodsReceipt.findOne.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).rejects.toThrow(ErpPostingException);
    });

    it('blocks cancelling even when the posted payment is soft-deleted', async () => {
      const repositories = createRepositories();

      // The service must query withDeleted:true — this mock simulates the
      // withDeleted lookup surfacing a soft-deleted-but-POSTED payment.
      repositories.supplierPayment.findOne.mockImplementation(
        async ({ withDeleted }: { withDeleted?: boolean }) =>
          withDeleted === true
            ? {
                id: 'supplier-payment-2',
                supplierInvoiceId: INVOICE_ID,
                docStatus: 'POSTED',
              }
            : null,
      );
      repositories.goodsReceipt.findOne.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).rejects.toThrow(ErpPostingException);
    });

    it('blocks cancelling an invoice with a posted goods receipt still linked', async () => {
      const repositories = createRepositories();

      repositories.supplierPayment.findOne.mockResolvedValue(null);
      repositories.goodsReceipt.findOne.mockResolvedValue({
        id: 'goods-receipt-1',
        supplierInvoiceId: INVOICE_ID,
        docStatus: 'POSTED',
      });
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).rejects.toThrow(ErpPostingException);
    });

    it('blocks cancelling even when the posted goods receipt is soft-deleted', async () => {
      const repositories = createRepositories();

      repositories.supplierPayment.findOne.mockResolvedValue(null);
      // The service must query withDeleted:true — this mock simulates the
      // withDeleted lookup surfacing a soft-deleted-but-POSTED receipt.
      repositories.goodsReceipt.findOne.mockImplementation(
        async ({ withDeleted }: { withDeleted?: boolean }) =>
          withDeleted === true
            ? {
                id: 'goods-receipt-2',
                supplierInvoiceId: INVOICE_ID,
                docStatus: 'POSTED',
              }
            : null,
      );
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).rejects.toThrow(ErpPostingException);
    });
  });
});
