// The real manager transitively imports TypeORM entities and GraphQL DTOs
// that cannot load in a unit-test environment; the service only needs it as
// an injected collaborator, faked below. Same technique as
// erp-accounting/__tests__/trial-balance.service.spec.ts.
jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class GlobalWorkspaceOrmManager {} }),
);

import { NotFoundException } from '@nestjs/common';

import { BankStatementImportService } from 'src/engine/core-modules/erp-accounting/services/bank-statement-import.service';
import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = 'organization-1';
const OUR_INN = '7706123456';
const COUNTERPARTY_INN = '7712345678';

type FakeRepository = {
  findOneBy: jest.Mock;
  findBy: jest.Mock;
  save: jest.Mock;
};

// The real WorkspaceRepository.save() resolves to formatData()'s output, not
// a DB read-back — a saved record does NOT reliably come back with a
// server-generated id (confirmed live against the dev server; see the
// crypto.randomUUID() comments in bank-statement-import.service.ts), so this
// fake echoes the input verbatim rather than injecting one. That forces the
// service to generate and pass its own id, the way production code must.
const buildFakeRepository = (
  overrides: Partial<FakeRepository> = {},
): FakeRepository => ({
  findOneBy: jest.fn().mockResolvedValue(null),
  findBy: jest.fn().mockResolvedValue([]),
  save: jest.fn(async (entity: Record<string, unknown>) => ({ ...entity })),
  ...overrides,
});

// Only the fields importDocument reads/writes matter for these tests; the
// getRepository call fans out to whichever fake the test wired up.
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
    service: new BankStatementImportService(fakeGlobalWorkspaceOrmManager),
    transactionScope,
  };
};

// One-document 1CClientBankExchange text — enough to exercise direction,
// idempotency and counterparty resolution without depending on parser
// internals already covered by parse-bank-statement-file.util.spec.ts.
const buildStatementText = ({
  number = '15',
  date = '20.08.2026',
  amountRub = 11_800,
  payerInn,
  payerName = '',
  payeeInn,
  payeeName = '',
  purpose = 'Оплата по договору',
}: {
  number?: string;
  date?: string;
  amountRub?: number;
  payerInn?: string;
  payerName?: string;
  payeeInn?: string;
  payeeName?: string;
  purpose?: string;
}): string =>
  [
    '1CClientBankExchange',
    'Кодировка=UTF-8',
    'СекцияДокумент=Платежное поручение',
    `Номер=${number}`,
    `Дата=${date}`,
    `Сумма=${amountRub}.00`,
    payerInn ? `ПлательщикИНН=${payerInn}` : null,
    payerName ? `Плательщик1=${payerName}` : null,
    payeeInn ? `ПолучательИНН=${payeeInn}` : null,
    payeeName ? `Получатель1=${payeeName}` : null,
    `НазначениеПлатежа=${purpose}`,
    'КонецДокумента',
    'КонецФайла',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

const organizationRepo = (inn = OUR_INN) =>
  buildFakeRepository({
    findOneBy: jest.fn().mockResolvedValue({ id: ORGANIZATION_ID, inn }),
  });

describe('BankStatementImportService', () => {
  it('throws NotFoundException when the organization does not exist', async () => {
    const { service } = createService({
      organization: buildFakeRepository(),
    });

    await expect(
      service.importStatement(WORKSPACE_ID, ORGANIZATION_ID, 'КонецФайла'),
    ).rejects.toThrow(NotFoundException);
  });

  it('creates a DRAFT payment (incoming) and a new company when the payee ИНН matches the organization', async () => {
    const paymentRepo = buildFakeRepository();
    const companyRepo = buildFakeRepository();
    const { service } = createService({
      organization: organizationRepo(),
      company: companyRepo,
      payment: paymentRepo,
    });

    const text = buildStatementText({
      payerInn: COUNTERPARTY_INN,
      payerName: 'ООО Ромашка',
      payeeInn: OUR_INN,
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(report.errors).toEqual([]);
    expect(report.skipped).toEqual([]);
    expect(report.created).toEqual([
      expect.objectContaining({
        type: 'payment',
        amountKopecks: 1_180_000,
        counterparty: 'ООО Ромашка',
      }),
    ]);
    expect(companyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        name: 'ООО Ромашка',
        inn: COUNTERPARTY_INN,
      }),
    );
    // The payment must link to the exact id the company was saved with —
    // not to whatever (unreliable) id .save() resolved to.
    const savedCompanyId = companyRepo.save.mock.calls[0][0].id;

    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        organizationId: ORGANIZATION_ID,
        payerId: savedCompanyId,
        docStatus: 'DRAFT',
        comment: expect.stringContaining(
          'Импорт выписки: платёжка № 15 от 20.08.2026',
        ),
      }),
    );
  });

  it('creates a DRAFT supplierPayment (outgoing) when the payer ИНН matches the organization', async () => {
    const supplierPaymentRepo = buildFakeRepository();
    const companyRepo = buildFakeRepository();
    const { service } = createService({
      organization: organizationRepo(),
      company: companyRepo,
      supplierPayment: supplierPaymentRepo,
    });

    const text = buildStatementText({
      payerInn: OUR_INN,
      payeeInn: COUNTERPARTY_INN,
      payeeName: 'ООО Поставщик',
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(report.created).toEqual([
      expect.objectContaining({ type: 'supplierPayment' }),
    ]);
    const savedCompanyId = companyRepo.save.mock.calls[0][0].id;

    expect(supplierPaymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: savedCompanyId }),
    );
  });

  it('reuses an existing company found by ИНН instead of creating a duplicate', async () => {
    const companyRepo = buildFakeRepository({
      findOneBy: jest.fn().mockResolvedValue({
        id: 'existing-company-1',
        name: 'ООО Ромашка (уже в базе)',
        inn: COUNTERPARTY_INN,
      }),
    });
    const paymentRepo = buildFakeRepository();
    const { service } = createService({
      organization: organizationRepo(),
      company: companyRepo,
      payment: paymentRepo,
    });

    const text = buildStatementText({
      payerInn: COUNTERPARTY_INN,
      payeeInn: OUR_INN,
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(companyRepo.save).not.toHaveBeenCalled();
    expect(report.created[0].counterparty).toBe('ООО Ромашка (уже в базе)');
    expect(paymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ payerId: 'existing-company-1' }),
    );
  });

  it('skips a row already imported (idempotent re-run), matched by comment prefix, amount and counterparty', async () => {
    const existingPayment = {
      id: 'existing-payment-1',
      comment:
        'Импорт выписки: платёжка № 15 от 20.08.2026; Оплата по договору',
      amount: { amountMicros: 1_180_000 * 10_000, currencyCode: 'RUB' },
    };
    const paymentRepo = buildFakeRepository({
      findBy: jest.fn().mockResolvedValue([existingPayment]),
    });
    const companyRepo = buildFakeRepository({
      findOneBy: jest
        .fn()
        .mockResolvedValue({ id: 'company-1', name: 'ООО Ромашка' }),
    });
    const { service } = createService({
      organization: organizationRepo(),
      company: companyRepo,
      payment: paymentRepo,
    });

    const text = buildStatementText({
      payerInn: COUNTERPARTY_INN,
      payeeInn: OUR_INN,
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(report.created).toEqual([]);
    expect(report.skipped).toEqual([
      expect.objectContaining({
        documentNumber: '15',
        reason: expect.stringContaining('Уже импортировано'),
      }),
    ]);
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it('skips a transfer between the organization’s own accounts (both ИНН match)', async () => {
    const { service } = createService({
      organization: organizationRepo(),
    });

    const text = buildStatementText({ payerInn: OUR_INN, payeeInn: OUR_INN });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(report.created).toEqual([]);
    expect(report.errors).toEqual([]);
    expect(report.skipped).toEqual([
      expect.objectContaining({
        documentNumber: '15',
        reason: expect.stringContaining('Перевод между своими счетами'),
      }),
    ]);
  });

  it('reports a RU error when neither party ИНН matches the organization', async () => {
    const { service } = createService({
      organization: organizationRepo(),
    });

    const text = buildStatementText({
      payerInn: '1111111111',
      payeeInn: '2222222222',
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      text,
    );

    expect(report.created).toEqual([]);
    expect(report.skipped).toEqual([]);
    expect(report.errors).toEqual([
      expect.stringContaining('Платёжка № 15'),
    ]);
    expect(report.errors[0]).toContain('не совпадает с ИНН организации');
  });

  it('reports a RU error for a broken/unrecognised file without throwing', async () => {
    const { service } = createService({
      organization: organizationRepo(),
    });

    const report = await service.importStatement(
      WORKSPACE_ID,
      ORGANIZATION_ID,
      'случайный текст без структуры формата',
    );

    expect(report.created).toEqual([]);
    expect(report.skipped).toEqual([]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain('1CClientBankExchange');
  });
});
