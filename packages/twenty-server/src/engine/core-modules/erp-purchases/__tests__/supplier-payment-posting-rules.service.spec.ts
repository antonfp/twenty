import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { SupplierPaymentPostingRulesService } from 'src/engine/core-modules/erp-purchases/services/supplier-payment-posting-rules.service';
import { type ErpPartyLedgerEntryRow } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const PAYMENT_ID = 'supplier-payment-1';
const INVOICE_ID = 'supplier-invoice-1';

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
  documentObjectName: 'supplierPayment',
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
    nextDocumentNumber: jest.fn().mockResolvedValue('PO-000007'),
  };

  return {
    service: new SupplierPaymentPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const payment = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: PAYMENT_ID,
  amount: rubles(1000),
  supplierInvoiceId: INVOICE_ID,
  supplierId: 'supplier-1',
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
  supplierId: 'supplier-1',
  organizationId: 'organization-1',
  ...overrides,
});

describe('SupplierPaymentPostingRulesService', () => {
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
          payment({ supplierInvoiceId: null }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a payment whose invoice does not exist', async () => {
      const repositories = { supplierInvoice: createMockRepository() };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(null);
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a payment whose invoice is not POSTED', async () => {
      const repositories = { supplierInvoice: createMockRepository() };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(
        postedInvoice({ docStatus: 'DRAFT' }),
      );
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).rejects.toThrow(ErpPostingException);
    });

    it('accepts a positive payment against a POSTED invoice', async () => {
      const repositories = { supplierInvoice: createMockRepository() };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      await expect(
        service.validate(createContext(repositories), payment(), []),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPartyEntries', () => {
    it('marks a partial payment as PARTIALLY_PAID and returns a positive entry', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierPayment: createMockRepository(),
      };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      const entries = (await service.getPartyEntries(
        createContext(repositories),
        payment(),
        [],
      )) as unknown as ErpPartyLedgerEntryRow[];

      expect(repositories.supplierInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          paidAmount: rubles(1000),
          paymentStatus: 'PARTIALLY_PAID',
        },
      );

      expect(repositories.supplierPayment.update).toHaveBeenCalledWith(
        PAYMENT_ID,
        {
          number: 'PO-000007',
          name: 'Оплата поставщику № PO-000007 от 25.08.2026',
        },
      );

      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        name: 'Оплата поставщику № PO-000007 от 25.08.2026',
        companyId: 'supplier-1',
        organizationId: 'organization-1',
        voucherType: 'supplierPayment',
        voucherId: PAYMENT_ID,
        amount: rubles(1000),
        postingDate: '2026-08-25',
        isCancelled: false,
        isCancellation: false,
      });
    });

    it('marks the invoice PAID when accumulated payments reach the total', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierPayment: createMockRepository(),
      };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(
        postedInvoice({ paidAmount: rubles(1500) }),
      );
      const { service } = createService();

      await service.getPartyEntries(
        createContext(repositories),
        payment({ amount: rubles(600) }),
        [],
      );

      expect(repositories.supplierInvoice.update).toHaveBeenCalledWith(
        INVOICE_ID,
        {
          paidAmount: rubles(2100),
          paymentStatus: 'PAID',
        },
      );
    });

    it('falls back to the invoice supplier when the payment has no supplier', async () => {
      const repositories = {
        supplierInvoice: createMockRepository(),
        supplierPayment: createMockRepository(),
      };

      repositories.supplierInvoice.findOneBy.mockResolvedValue(postedInvoice());
      const { service } = createService();

      const entries = (await service.getPartyEntries(
        createContext(repositories),
        payment({ supplierId: null }),
        [],
      )) as unknown as ErpPartyLedgerEntryRow[];

      expect(entries[0].companyId).toBe('supplier-1');
    });
  });
});

describe('SupplierPaymentPostingRulesService onCancel', () => {
  it('rolls a fully paid invoice back to PARTIALLY_PAID', async () => {
    const invoiceRepository = createMockRepository();

    invoiceRepository.findOneBy.mockResolvedValue(
      postedInvoice({ total: rubles(90000), paidAmount: rubles(90000) }),
    );
    const { service } = createService();

    await service.onCancel(
      createContext({ supplierInvoice: invoiceRepository }),
      payment({ amount: rubles(50000) }),
    );

    expect(invoiceRepository.update).toHaveBeenCalledWith(INVOICE_ID, {
      paidAmount: rubles(40000),
      paymentStatus: 'PARTIALLY_PAID',
    });
  });

  it('rolls back to UNPAID when the cancelled payment was the only one', async () => {
    const invoiceRepository = createMockRepository();

    invoiceRepository.findOneBy.mockResolvedValue(
      postedInvoice({ total: rubles(90000), paidAmount: rubles(40000) }),
    );
    const { service } = createService();

    await service.onCancel(
      createContext({ supplierInvoice: invoiceRepository }),
      payment({ amount: rubles(40000) }),
    );

    expect(invoiceRepository.update).toHaveBeenCalledWith(INVOICE_ID, {
      paidAmount: rubles(0),
      paymentStatus: 'UNPAID',
    });
  });

  it('does nothing when the payment has no linked invoice', async () => {
    const invoiceRepository = createMockRepository();
    const { service } = createService();

    await service.onCancel(
      createContext({ supplierInvoice: invoiceRepository }),
      payment({ supplierInvoiceId: null, amount: rubles(100) }),
    );

    expect(invoiceRepository.update).not.toHaveBeenCalled();
  });
});
