import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { PaymentPostingRulesService } from 'src/engine/core-modules/erp-sales/services/payment-posting-rules.service';
import { type ErpPartyLedgerEntryRow } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const PAYMENT_ID = 'payment-1';
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
  documentObjectName: 'payment',
  documentId: PAYMENT_ID,
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
    nextDocumentNumber: jest.fn().mockResolvedValue('PM-000007'),
  };

  return {
    service: new PaymentPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const payment = (overrides: Record<string, unknown> = {}): ErpDocumentRecord => ({
  id: PAYMENT_ID,
  amount: rubles(1000),
  salesInvoiceId: INVOICE_ID,
  payerId: 'payer-1',
  number: null,
  ...overrides,
});

const postedInvoice = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: INVOICE_ID,
  docStatus: 'POSTED',
  total: rubles(2000),
  paidAmount: null,
  customerId: 'customer-1',
  organizationId: 'organization-1',
  ...overrides,
});

describe('PaymentPostingRulesService', () => {
  describe('validate', () => {
    it('rejects a non-positive amount', async () => {
      const { service } = createService();

      await expect(
        service.validate(createContext({}), payment({ amount: rubles(0) }), []),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a payment without a linked invoice', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({}),
          payment({ salesInvoiceId: null }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a payment whose invoice does not exist', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a payment whose invoice is not POSTED', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue(
        postedInvoice({ docStatus: 'DRAFT' }),
      );
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).rejects.toThrow(ErpPostingException);
    });

    it('accepts a positive payment against a POSTED invoice', async () => {
      const repositories = { salesInvoice: createMockRepository() };

      repositories.salesInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPartyEntries', () => {
    it('marks a partial payment as PARTIALLY_PAID and returns a negative entry', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        payment: createMockRepository(),
      };

      repositories.salesInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      const entries = (await service.getPartyEntries(
        createContext(repositories),
        payment(),
        [],
      )) as unknown as ErpPartyLedgerEntryRow[];

      expect(repositories.salesInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          paidAmount: rubles(1000),
          paymentStatus: 'PARTIALLY_PAID',
        },
      );

      expect(repositories.payment.update).toHaveBeenCalledWith(PAYMENT_ID, {
        number: 'PM-000007',
        name: 'Оплата № PM-000007 от 25.08.2026',
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        name: 'Оплата № PM-000007 от 25.08.2026',
        companyId: 'payer-1',
        organizationId: 'organization-1',
        voucherType: 'payment',
        voucherId: PAYMENT_ID,
        amount: rubles(-1000),
        postingDate: '2026-08-25',
        isCancelled: false,
        isCancellation: false,
      });
    });

    it('marks the invoice PAID when accumulated payments reach the total', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        payment: createMockRepository(),
      };

      repositories.salesInvoice.findOneBy.mockResolvedValue(
        postedInvoice({ paidAmount: rubles(1500) }),
      );
      const { service } = createService();

      await service.getPartyEntries(
        createContext(repositories),
        payment({ amount: rubles(600) }),
        [],
      );

      expect(repositories.salesInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          paidAmount: rubles(2100),
          paymentStatus: 'PAID',
        },
      );
    });

    it('falls back to the invoice customer when the payment has no payer', async () => {
      const repositories = {
        salesInvoice: createMockRepository(),
        payment: createMockRepository(),
      };

      repositories.salesInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      const entries = (await service.getPartyEntries(
        createContext(repositories),
        payment({ payerId: null }),
        [],
      )) as unknown as ErpPartyLedgerEntryRow[];

      expect(entries[0].companyId).toBe('customer-1');
    });
  });
});
