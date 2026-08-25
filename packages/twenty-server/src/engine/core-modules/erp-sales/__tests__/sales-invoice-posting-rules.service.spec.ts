import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { SalesInvoicePostingRulesService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-posting-rules.service';
import { type ErpPartyLedgerEntryRow } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const INVOICE_ID = 'invoice-1';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const createMockRepository = () => ({
  update: jest.fn().mockResolvedValue(undefined),
  findOneBy: jest.fn(),
  findBy: jest.fn(),
});

type MockRepository = ReturnType<typeof createMockRepository>;

const createContext = (
  repositories: Record<string, MockRepository>,
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName: 'salesInvoice',
  documentId: INVOICE_ID,
  postingDate: '2026-08-25',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) => repositories[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const createService = (nextNumber = 'SI-000001') => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue(nextNumber),
  };

  return {
    service: new SalesInvoicePostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const invoice = (overrides: Record<string, unknown> = {}): ErpDocumentRecord => ({
  id: INVOICE_ID,
  customerId: 'customer-1',
  organizationId: 'organization-1',
  number: null,
  ...overrides,
});

describe('SalesInvoicePostingRulesService', () => {
  describe('validate', () => {
    it('rejects an invoice without lines', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext({}), invoice(), []),
      ).toThrow(ErpPostingException);
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
    it('recomputes totals with VAT-in-price, updates the invoice and returns one +total entry', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        salesInvoiceLine: createMockRepository(),
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
      expect(repositories.salesInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          number: 'SI-000001',
          name: 'Счёт № SI-000001 от 25.08.2026',
          total: rubles(36100.02),
          vatTotal: rubles(6000),
        },
      );

      // line-1 amount was empty and gets written; line-2 already matches
      expect(repositories.salesInvoiceLine.update).toHaveBeenCalledTimes(1);
      expect(repositories.salesInvoiceLine.update).toHaveBeenCalledWith(
        'line-1',
        { amount: rubles(36000) },
      );

      expect(documentNumberingService.nextDocumentNumber).toHaveBeenCalledWith(
        expect.objectContaining({ docType: 'salesInvoice', prefix: 'SI' }),
      );

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        name: 'Счёт № SI-000001 от 25.08.2026',
        companyId: 'customer-1',
        organizationId: 'organization-1',
        voucherType: 'salesInvoice',
        voucherId: INVOICE_ID,
        amount: rubles(36100.02),
        postingDate: '2026-08-25',
        isCancelled: false,
        isCancellation: false,
      });
    });

    it('rounds VAT and line amounts to kopecks half away from zero', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        salesInvoiceLine: createMockRepository(),
      };
      const context = createContext(repositories);
      const { service } = createService();

      const entries = (await service.getPartyEntries(context, invoice(), [
        // 0,05 × 1 → НДС 20/120 от 5 коп = 0,83 коп → 1 коп
        { id: 'line-1', quantity: 1, price: rubles(0.05), vatRate: 'VAT_20' },
        // 0,5 × 0,03 = 1,5 коп → 2 коп; НДС 2×20/120 = 0,33 коп → 0 коп
        { id: 'line-2', quantity: 0.5, price: rubles(0.03), vatRate: 'VAT_20' },
      ])) as unknown as ErpPartyLedgerEntryRow[];

      expect(repositories.salesInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        expect.objectContaining({
          total: rubles(0.07),
          vatTotal: rubles(0.01),
        }),
      );
      expect(entries[0].amount).toEqual(rubles(0.07));
    });

    it('keeps an existing document number and skips numbering', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        salesInvoiceLine: createMockRepository(),
      };
      const context = createContext(repositories);
      const { service, documentNumberingService } = createService();

      await service.getPartyEntries(context, invoice({ number: '42' }), [
        { id: 'line-1', quantity: 1, price: rubles(100), vatRate: 'NO_VAT' },
      ]);

      expect(documentNumberingService.nextDocumentNumber).not.toHaveBeenCalled();
      expect(repositories.salesInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        expect.objectContaining({
          number: '42',
          name: 'Счёт № 42 от 25.08.2026',
        }),
      );
    });
  });

  describe('onCancel', () => {
    it('allows cancelling an invoice with no payments at all', async () => {
      const repositories = { payment: createMockRepository() };

      repositories.payment.findOneBy.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).resolves.toBeUndefined();
      expect(repositories.payment.findOneBy).toHaveBeenCalledWith({
        salesInvoiceId: INVOICE_ID,
        docStatus: 'POSTED',
      });
    });

    it('allows cancelling an invoice whose only payment is cancelled', async () => {
      const repositories = { payment: createMockRepository() };

      // The docStatus:POSTED filter itself excludes a CANCELLED payment;
      // simulated here by the mock returning no match.
      repositories.payment.findOneBy.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).resolves.toBeUndefined();
    });

    it('blocks cancelling an invoice with a posted payment still linked', async () => {
      const repositories = { payment: createMockRepository() };

      repositories.payment.findOneBy.mockResolvedValue({
        id: 'payment-1',
        salesInvoiceId: INVOICE_ID,
        docStatus: 'POSTED',
      });
      const { service } = createService();

      await expect(
        service.onCancel(createContext(repositories), invoice()),
      ).rejects.toThrow(ErpPostingException);
    });
  });
});
