// Same collaborator-faking technique as bank-statement-import.service.spec.ts:
// the real manager transitively imports TypeORM entities/GraphQL DTOs that
// cannot load in a unit-test environment.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';
const OUR_COMPANY_INN = '7712345678';
const FOREIGN_INN = '7799999999';

const rub = (amount: number) => ({
  amountMicros: amount * 1_000_000,
  currencyCode: 'RUB',
});

type FakeRepository = {
  findBy: jest.Mock;
  findOneBy: jest.Mock;
  update: jest.Mock;
};

const buildFakeRepository = (
  overrides: Partial<FakeRepository> = {},
): FakeRepository => ({
  findBy: jest.fn().mockResolvedValue([]),
  findOneBy: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createService = (
  repositoriesByObjectName: Record<string, FakeRepository>,
) => {
  const transactionScope: WorkspaceTransactionScope = {
    getRepository: jest.fn(
      (objectName: string) => repositoriesByObjectName[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  };
  const fakeGlobalWorkspaceOrmManager = {
    executeInWorkspaceContext: (fn: () => unknown) => fn(),
    runInWorkspaceTransaction: (
      work: (scope: WorkspaceTransactionScope) => Promise<unknown>,
    ) => work(transactionScope),
  } as unknown as GlobalWorkspaceOrmManager;

  return {
    service: new ReconciliationService(fakeGlobalWorkspaceOrmManager),
    transactionScope,
  };
};

const emptyRepos = () => ({
  payment: buildFakeRepository(),
  supplierPayment: buildFakeRepository(),
  salesInvoice: buildFakeRepository(),
  supplierInvoice: buildFakeRepository(),
  company: buildFakeRepository(),
});

describe('ReconciliationService.getReconciliationProposals', () => {
  it('returns no proposals when there are no unlinked DRAFT payments', async () => {
    const { service } = createService(emptyRepos());

    const proposals = await service.getReconciliationProposals(
      WORKSPACE_ID,
      ORGANIZATION_ID,
    );

    expect(proposals).toEqual([]);
  });

  it('queries open invoices restricted to UNPAID/PARTIALLY_PAID (оплаченный счёт не кандидат)', async () => {
    const repos = emptyRepos();

    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'DRAFT',
        amount: rub(1500),
        comment: null,
        payerId: 'company-payer',
      },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-payer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
    ]);

    const { service } = createService(repos);

    await service.getReconciliationProposals(WORKSPACE_ID, ORGANIZATION_ID);

    expect(repos.salesInvoice.findBy).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
      }),
    );
    const salesInvoiceQuery = repos.salesInvoice.findBy.mock.calls[0][0];

    // typeorm In() operator — assert on its resolved values, not identity.
    expect(salesInvoiceQuery.paymentStatus.value).toEqual([
      'UNPAID',
      'PARTIALLY_PAID',
    ]);
  });

  it('excludes a candidate whose counterparty ИНН does not match the payer ИНН (обязательный фильтр)', async () => {
    const repos = emptyRepos();

    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'DRAFT',
        amount: rub(1500),
        comment: null,
        payerId: 'company-payer',
      },
    ]);
    repos.salesInvoice.findBy.mockResolvedValue([
      {
        id: 'invoice-1',
        number: 'SI-000001',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        paymentStatus: 'UNPAID',
        total: rub(1500),
        paidAmount: rub(0),
        customerId: 'company-customer',
      },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-payer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
      { id: 'company-customer', name: 'ООО Чужая', inn: FOREIGN_INN },
    ]);

    const { service } = createService(repos);

    const [proposal] = await service.getReconciliationProposals(
      WORKSPACE_ID,
      ORGANIZATION_ID,
    );

    expect(proposal.candidates).toEqual([]);
  });

  it('excludes a candidate with no remaining balance even if paymentStatus is stale PARTIALLY_PAID', async () => {
    const repos = emptyRepos();

    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'DRAFT',
        amount: rub(500),
        comment: null,
        payerId: 'company-payer',
      },
    ]);
    repos.salesInvoice.findBy.mockResolvedValue([
      {
        id: 'invoice-1',
        number: 'SI-000001',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        paymentStatus: 'PARTIALLY_PAID',
        total: rub(1000),
        paidAmount: rub(1000), // остаток = 0 despite the stale status
        customerId: 'company-customer',
      },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-payer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
      { id: 'company-customer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
    ]);

    const { service } = createService(repos);

    const [proposal] = await service.getReconciliationProposals(
      WORKSPACE_ID,
      ORGANIZATION_ID,
    );

    expect(proposal.candidates).toEqual([]);
  });

  it('computes остаток as total − paidAmount and scores/sorts multiple candidates by score', async () => {
    const repos = emptyRepos();

    repos.payment.findBy.mockResolvedValue([
      {
        id: 'payment-1',
        organizationId: ORGANIZATION_ID,
        docStatus: 'DRAFT',
        amount: rub(900), // partial for invoice-1 (remaining 1500), partial for invoice-2 (remaining 900 — exact)
        comment: 'Частичная оплата, счёт № SI-000002',
        payerId: 'company-payer',
      },
    ]);
    repos.salesInvoice.findBy.mockResolvedValue([
      {
        id: 'invoice-1',
        number: 'SI-000001',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        paymentStatus: 'UNPAID',
        total: rub(2000),
        paidAmount: rub(500), // остаток = 1500 → payment 900 is PARTIAL
        customerId: 'company-customer',
      },
      {
        id: 'invoice-2',
        number: 'SI-000002',
        organizationId: ORGANIZATION_ID,
        docStatus: 'POSTED',
        paymentStatus: 'UNPAID',
        total: rub(900),
        paidAmount: rub(0), // остаток = 900 → payment 900 is EXACT + comment mentions number
        customerId: 'company-customer',
      },
    ]);
    repos.company.findBy.mockResolvedValue([
      { id: 'company-payer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
      { id: 'company-customer', name: 'ООО Ромашка', inn: OUR_COMPANY_INN },
    ]);

    const { service } = createService(repos);

    const [proposal] = await service.getReconciliationProposals(
      WORKSPACE_ID,
      ORGANIZATION_ID,
    );

    expect(proposal.candidates).toHaveLength(2);
    // Best candidate first: exact amount + comment mentions its number.
    expect(proposal.candidates[0]).toEqual(
      expect.objectContaining({
        invoiceId: 'invoice-2',
        remainingKopecks: 90_000,
        score: 3,
      }),
    );
    expect(proposal.candidates[1]).toEqual(
      expect.objectContaining({
        invoiceId: 'invoice-1',
        remainingKopecks: 150_000,
        score: 1,
      }),
    );
    expect(proposal.candidates[0].explanation).toContain('ИНН');
  });
});

describe('ReconciliationService.confirmReconciliation', () => {
  it('throws NotFoundException when the payment does not exist in either object', async () => {
    const { service } = createService(emptyRepos());

    await expect(
      service.confirmReconciliation(
        WORKSPACE_ID,
        'missing-payment',
        'invoice-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('is idempotent: confirming the same pair twice succeeds without a second write', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: 'invoice-1',
      payerId: 'company-payer',
    });

    const { service } = createService(repos);

    const result = await service.confirmReconciliation(
      WORKSPACE_ID,
      'payment-1',
      'invoice-1',
    );

    expect(result).toEqual({
      success: true,
      alreadyLinked: true,
      message: 'Платёж уже привязан к этому счёту.',
    });
    expect(repos.payment.update).not.toHaveBeenCalled();
  });

  it('rejects re-linking an already-linked payment to a different invoice', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: 'invoice-1',
      payerId: 'company-payer',
    });

    const { service } = createService(repos);

    await expect(
      service.confirmReconciliation(WORKSPACE_ID, 'payment-1', 'invoice-2'),
    ).rejects.toThrow('Платёж уже привязан — отвяжите вручную.');
    expect(repos.payment.update).not.toHaveBeenCalled();
  });

  it('rejects re-linking even when the new invoice id does not exist (guard fires before loading it)', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: 'invoice-1',
      payerId: 'company-payer',
    });

    const { service } = createService(repos);

    await expect(
      service.confirmReconciliation(
        WORKSPACE_ID,
        'payment-1',
        'does-not-exist',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(repos.salesInvoice.findOneBy).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the target invoice does not exist', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: null,
      payerId: 'company-payer',
    });

    const { service } = createService(repos);

    await expect(
      service.confirmReconciliation(
        WORKSPACE_ID,
        'payment-1',
        'missing-invoice',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects when the payment and invoice belong to different organizations', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: null,
      payerId: 'company-payer',
    });
    repos.salesInvoice.findOneBy.mockResolvedValue({
      id: 'invoice-1',
      number: 'SI-000001',
      organizationId: 'other-organization',
      customerId: 'company-customer',
    });

    const { service } = createService(repos);

    await expect(
      service.confirmReconciliation(WORKSPACE_ID, 'payment-1', 'invoice-1'),
    ).rejects.toThrow('Платёж и счёт принадлежат разным организациям.');
  });

  it('rejects when the counterparty ИНН does not match between payment and invoice', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: null,
      payerId: 'company-payer',
    });
    repos.salesInvoice.findOneBy.mockResolvedValue({
      id: 'invoice-1',
      number: 'SI-000001',
      organizationId: ORGANIZATION_ID,
      customerId: 'company-customer',
    });
    repos.company.findOneBy.mockImplementation(({ id }: { id: string }) =>
      Promise.resolve(
        id === 'company-payer'
          ? { id, name: 'ООО Ромашка', inn: OUR_COMPANY_INN }
          : { id, name: 'ООО Чужая', inn: FOREIGN_INN },
      ),
    );

    const { service } = createService(repos);

    await expect(
      service.confirmReconciliation(WORKSPACE_ID, 'payment-1', 'invoice-1'),
    ).rejects.toThrow(
      'Контрагент платежа не совпадает со счётом по ИНН — привязка невозможна.',
    );
    expect(repos.payment.update).not.toHaveBeenCalled();
  });

  it('links the payment to the invoice when all validations pass (payment side)', async () => {
    const repos = emptyRepos();

    repos.payment.findOneBy.mockResolvedValue({
      id: 'payment-1',
      organizationId: ORGANIZATION_ID,
      salesInvoiceId: null,
      payerId: 'company-payer',
    });
    repos.salesInvoice.findOneBy.mockResolvedValue({
      id: 'invoice-1',
      number: 'SI-000001',
      organizationId: ORGANIZATION_ID,
      customerId: 'company-customer',
    });
    repos.company.findOneBy.mockResolvedValue({
      id: 'company-any',
      name: 'ООО Ромашка',
      inn: OUR_COMPANY_INN,
    });

    const { service } = createService(repos);

    const result = await service.confirmReconciliation(
      WORKSPACE_ID,
      'payment-1',
      'invoice-1',
    );

    expect(result).toEqual({
      success: true,
      alreadyLinked: false,
      message: 'Платёж привязан к счёту № SI-000001.',
    });
    expect(repos.payment.update).toHaveBeenCalledWith('payment-1', {
      salesInvoiceId: 'invoice-1',
    });
  });

  it('resolves a supplierPayment (checked when the id is absent from payment) and links via supplierInvoiceId', async () => {
    const repos = emptyRepos();

    // Not found in `payment` -> service falls through to `supplierPayment`.
    repos.payment.findOneBy.mockResolvedValue(null);
    repos.supplierPayment.findOneBy.mockResolvedValue({
      id: 'supplier-payment-1',
      organizationId: ORGANIZATION_ID,
      supplierInvoiceId: null,
      supplierId: 'company-supplier',
    });
    repos.supplierInvoice.findOneBy.mockResolvedValue({
      id: 'supplier-invoice-1',
      number: 'PI-000001',
      organizationId: ORGANIZATION_ID,
      supplierId: 'company-supplier-2',
    });
    repos.company.findOneBy.mockResolvedValue({
      id: 'company-any',
      name: 'ООО Поставщик',
      inn: OUR_COMPANY_INN,
    });

    const { service } = createService(repos);

    const result = await service.confirmReconciliation(
      WORKSPACE_ID,
      'supplier-payment-1',
      'supplier-invoice-1',
    );

    expect(result.success).toBe(true);
    expect(repos.supplierPayment.update).toHaveBeenCalledWith(
      'supplier-payment-1',
      { supplierInvoiceId: 'supplier-invoice-1' },
    );
    expect(repos.payment.update).not.toHaveBeenCalled();
  });
});
