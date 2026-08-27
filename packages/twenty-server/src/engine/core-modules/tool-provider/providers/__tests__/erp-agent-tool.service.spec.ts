import { ForbiddenException } from '@nestjs/common';

import { FieldActorSource } from 'twenty-shared/types';

import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { type AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { type BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { type IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { type KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
import { type ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';
import { type TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { type SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { type SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { ErpAgentToolService } from 'src/engine/core-modules/tool-provider/providers/erp-agent-tool.service';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ROLE_ID = 'role-id';
const RECORD_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';
const ORGANIZATION_ID = '40404040-0d5c-4a83-91d7-63f5b1a2f001';

const context: ToolProviderContext = {
  workspaceId: WORKSPACE_ID,
  roleId: ROLE_ID,
  rolePermissionConfig: { unionOf: [ROLE_ID] },
  actorContext: {
    source: FieldActorSource.AGENT,
    workspaceMemberId: null,
    name: 'ERPilot-ассистент',
    context: {},
  },
};

const buildProvider = (options?: { permissionDenied?: boolean }) => {
  const postingService = {
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  } as unknown as PostingService;

  const trialBalanceService = {
    getTrialBalanceData: jest.fn().mockResolvedValue({
      rows: [
        {
          code: '62',
          name: 'Расчёты с покупателями',
          openingDebitKopecks: 0,
          openingCreditKopecks: 0,
          turnoverDebitKopecks: 1500000,
          turnoverCreditKopecks: 0,
          closingDebitKopecks: 1500000,
          closingCreditKopecks: 0,
        },
      ],
      totals: {
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 1500000,
        turnoverCreditKopecks: 0,
        closingDebitKopecks: 1500000,
        closingCreditKopecks: 0,
      },
    }),
  } as unknown as TrialBalanceService;

  const accountCardService = {
    getAccountCardData: jest.fn().mockResolvedValue({
      accountCode: '51',
      accountName: 'Расчётные счета',
      openingBalanceDebitKopecks: 0,
      openingBalanceCreditKopecks: 0,
      rows: [
        {
          glEntryId: 'gl-1',
          date: '2026-08-25',
          correspondingAccountId: 'account-62',
          debitKopecks: 122000,
          creditKopecks: 0,
          runningBalanceDebitKopecks: 122000,
          runningBalanceCreditKopecks: 0,
          voucherType: 'payment',
          voucherId: 'payment-1',
          correspondingAccountCode: '62.01',
          documentLabel: 'Поступление оплаты № PAY-000001',
        },
      ],
      closingBalanceDebitKopecks: 122000,
      closingBalanceCreditKopecks: 0,
      totalDebitKopecks: 122000,
      totalCreditKopecks: 0,
    }),
  } as unknown as AccountCardService;

  const balanceSheetService = {
    getBalanceSheetData: jest.fn().mockResolvedValue({
      reportDate: '2026-08-31',
      previousReportDate: '2025-12-31',
      lines: [
        {
          code: '1250',
          label: 'Денежные средства и денежные эквиваленты',
          group: 'ASSET',
          currentKopecks: 622_000,
          previousKopecks: 0,
        },
      ],
      totals: {
        assetsCurrentKopecks: 622_000,
        assetsPreviousKopecks: 0,
        liabilitiesCurrentKopecks: 622_000,
        liabilitiesPreviousKopecks: 0,
      },
    }),
  } as unknown as BalanceSheetService;

  const incomeStatementService = {
    getIncomeStatementData: jest.fn().mockResolvedValue({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      previousDateFrom: '2025-08-01',
      previousDateTo: '2025-08-31',
      lines: [
        {
          code: '2110',
          label: 'Выручка',
          currentKopecks: 100_000,
          previousKopecks: 0,
        },
      ],
    }),
  } as unknown as IncomeStatementService;

  const denied = options?.permissionDenied ?? false;
  const erpObjectPermissionGuardService = {
    assertCanUpdateObjectRecords: jest
      .fn()
      .mockImplementation(() =>
        denied
          ? Promise.reject(new ForbiddenException('Недостаточно прав.'))
          : Promise.resolve(undefined),
      ),
    assertCanReadObjectRecords: jest
      .fn()
      .mockImplementation(() =>
        denied
          ? Promise.reject(new ForbiddenException('Недостаточно прав.'))
          : Promise.resolve(undefined),
      ),
  } as unknown as ErpObjectPermissionGuardService;

  const printTemplateService = {
    findActiveTemplate: jest.fn().mockResolvedValue(null),
    resolveTemplateHtml: jest.fn().mockReturnValue({
      html: '<html>built-in</html>',
      source: 'built-in',
      fallbackReason: null,
    }),
    createOrUpdateActiveTemplate: jest
      .fn()
      .mockResolvedValue({ id: 'print-template-1' }),
  } as unknown as PrintTemplateService;

  const salesInvoicePrintService = {
    renderSalesInvoiceHtml: jest.fn().mockResolvedValue('<html>invoice</html>'),
  } as unknown as SalesInvoicePrintService;

  const salesShipmentPrintService = {
    renderSalesShipmentUpdHtml: jest.fn().mockResolvedValue('<html>upd</html>'),
  } as unknown as SalesShipmentPrintService;

  const reconciliationService = {
    getReconciliationProposals: jest.fn().mockResolvedValue([
      {
        paymentType: 'payment',
        paymentId: 'payment-1',
        paymentNumber: null,
        paymentAmountKopecks: 122000,
        paymentComment: 'Оплата по договору',
        counterpartyId: 'company-1',
        counterpartyName: 'ООО Ромашка',
        counterpartyInn: '7712345678',
        candidates: [
          {
            invoiceId: 'invoice-1',
            invoiceNumber: 'SI-000001',
            invoiceTotalKopecks: 122000,
            remainingKopecks: 122000,
            score: 2,
            explanation: 'ИНН контрагента совпадает; сумма точно совпадает.',
          },
        ],
      },
    ]),
    confirmReconciliation: jest.fn().mockResolvedValue({
      success: true,
      alreadyLinked: false,
      message: 'Платёж привязан к счёту № SI-000001.',
    }),
  } as unknown as ReconciliationService;

  const kudirService = {
    getKudirData: jest.fn().mockResolvedValue({
      organizationName: 'ООО «Ромашка»',
      organizationInn: '7712345678',
      taxSystemLabel: 'Доходы',
      year: 2026,
      entries: [
        {
          seq: 1,
          date: '2026-01-15',
          documentLabel: 'Поступление оплаты № PAY-000001 от 15.01.2026',
          content: 'Оплата по счёту № SI-000001 от 10.01.2026, ООО Ромашка',
          incomeKopecks: 122000,
          expenseKopecks: 0,
        },
      ],
      totalIncomeKopecks: 122000,
      totalExpenseKopecks: 0,
    }),
  } as unknown as KudirService;

  const service = new ErpAgentToolService(
    postingService,
    trialBalanceService,
    accountCardService,
    balanceSheetService,
    incomeStatementService,
    printTemplateService,
    salesInvoicePrintService,
    salesShipmentPrintService,
    reconciliationService,
    kudirService,
    erpObjectPermissionGuardService,
  );

  return {
    provider: service,
    postingService,
    trialBalanceService,
    accountCardService,
    balanceSheetService,
    incomeStatementService,
    printTemplateService,
    salesInvoicePrintService,
    salesShipmentPrintService,
    reconciliationService,
    kudirService,
    erpObjectPermissionGuardService,
  };
};

describe('ErpAgentToolService', () => {
  describe('ownsTool', () => {
    it('claims post_document/cancel_document/trial_balance/account_card/balance_sheet/income_statement/print tools and nothing else', () => {
      const { provider } = buildProvider();

      expect(provider.ownsTool('post_document')).toBe(true);
      expect(provider.ownsTool('cancel_document')).toBe(true);
      expect(provider.ownsTool('trial_balance')).toBe(true);
      expect(provider.ownsTool('account_card')).toBe(true);
      expect(provider.ownsTool('balance_sheet')).toBe(true);
      expect(provider.ownsTool('income_statement')).toBe(true);
      expect(provider.ownsTool('get_print_template')).toBe(true);
      expect(provider.ownsTool('update_print_template')).toBe(true);
      expect(provider.ownsTool('render_print_preview')).toBe(true);
      expect(provider.ownsTool('reconcile_payments')).toBe(true);
      expect(provider.ownsTool('confirm_reconciliation')).toBe(true);
      expect(provider.ownsTool('kudir')).toBe(true);
      expect(provider.ownsTool('http_request')).toBe(false);
    });
  });

  describe('generateDescriptors', () => {
    it('exposes post_document, cancel_document, trial_balance, account_card, balance_sheet, income_statement, the print tools, reconciliation tools and kudir', async () => {
      const { provider } = buildProvider();

      const descriptors = await provider.generateDescriptors(context, {
        includeSchemas: false,
      });

      expect(descriptors.map((descriptor) => descriptor.name)).toEqual(
        expect.arrayContaining([
          'post_document',
          'cancel_document',
          'trial_balance',
          'account_card',
          'balance_sheet',
          'income_statement',
          'get_print_template',
          'update_print_template',
          'render_print_preview',
          'reconcile_payments',
          'confirm_reconciliation',
          'kudir',
        ]),
      );

      for (const descriptor of descriptors) {
        expect(descriptor.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('post_document', () => {
    it('posts the document once the permission check passes', async () => {
      const { provider, postingService } = buildProvider();

      const output = await provider.executeStaticTool(
        'post_document',
        { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
        context,
      );

      expect(output.success).toBe(true);
      expect(postingService.post).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'salesInvoice',
        RECORD_ID,
      );
    });

    it('rejects when the role lacks canUpdateObjectRecords', async () => {
      const { provider, postingService } = buildProvider({
        permissionDenied: true,
      });

      await expect(
        provider.executeStaticTool(
          'post_document',
          { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(postingService.post).not.toHaveBeenCalled();
    });
  });

  describe('cancel_document', () => {
    it('cancels the document once the permission check passes', async () => {
      const { provider, postingService } = buildProvider();

      const output = await provider.executeStaticTool(
        'cancel_document',
        { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
        context,
      );

      expect(output.success).toBe(true);
      expect(postingService.cancel).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'salesInvoice',
        RECORD_ID,
      );
    });
  });

  describe('trial_balance', () => {
    it('wraps the ОСВ rows/totals into a ToolOutput result', async () => {
      const { provider, trialBalanceService } = buildProvider();

      const output = await provider.executeStaticTool(
        'trial_balance',
        {
          organizationId: ORGANIZATION_ID,
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              accountCode: '62',
              turnoverDebit: 1500000,
            }),
          ]),
          totals: expect.objectContaining({ turnoverDebit: 1500000 }),
        }),
      );
      expect(trialBalanceService.getTrialBalanceData).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on glEntry', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'trial_balance',
          {
            organizationId: ORGANIZATION_ID,
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
          },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('account_card', () => {
    it('wraps the карточка счёта rows into a ToolOutput result', async () => {
      const { provider, accountCardService } = buildProvider();

      const output = await provider.executeStaticTool(
        'account_card',
        {
          organizationId: ORGANIZATION_ID,
          accountCode: '51',
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          accountCode: '51',
          rows: expect.arrayContaining([
            expect.objectContaining({
              correspondingAccountCode: '62.01',
              debit: 122000,
            }),
          ]),
          closingBalanceDebit: 122000,
        }),
      );
      expect(accountCardService.getAccountCardData).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '51',
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on glEntry', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'account_card',
          {
            organizationId: ORGANIZATION_ID,
            accountCode: '51',
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
          },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('balance_sheet', () => {
    it('wraps the баланс lines/totals into a ToolOutput result', async () => {
      const { provider, balanceSheetService } = buildProvider();

      const output = await provider.executeStaticTool(
        'balance_sheet',
        { organizationId: ORGANIZATION_ID, date: '2026-08-31' },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          reportDate: '2026-08-31',
          totalAssets: { current: 622_000, previousYearEnd: 0 },
          totalLiabilities: { current: 622_000, previousYearEnd: 0 },
        }),
      );
      expect(balanceSheetService.getBalanceSheetData).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-31',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on glEntry', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'balance_sheet',
          { organizationId: ORGANIZATION_ID, date: '2026-08-31' },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('income_statement', () => {
    it('wraps the ОФР lines into a ToolOutput result', async () => {
      const { provider, incomeStatementService } = buildProvider();

      const output = await provider.executeStaticTool(
        'income_statement',
        {
          organizationId: ORGANIZATION_ID,
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ code: '2110', current: 100_000 }),
          ]),
        }),
      );
      expect(
        incomeStatementService.getIncomeStatementData,
      ).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on glEntry', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'income_statement',
          {
            organizationId: ORGANIZATION_ID,
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
          },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // Final whole-phase review Finding 2: the prompt promises print preview
  // to the internal agent — that requires these three actually being
  // reachable through this bridge, not just over raw MCP.
  describe('get_print_template', () => {
    it('wraps the raw template result into a ToolOutput result', async () => {
      const { provider, printTemplateService } = buildProvider();

      const output = await provider.executeStaticTool(
        'get_print_template',
        { documentType: 'SCHET' },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({ documentType: 'SCHET', source: 'built-in' }),
      );
      expect(printTemplateService.findActiveTemplate).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'SCHET',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on printTemplate', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'get_print_template',
          { documentType: 'SCHET' },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update_print_template', () => {
    it('creates/activates the override once the permission check passes', async () => {
      const { provider, printTemplateService } = buildProvider();

      const output = await provider.executeStaticTool(
        'update_print_template',
        { documentType: 'SCHET', html: '<div>{{organizationName}}</div>' },
        context,
      );

      expect(output.success).toBe(true);
      expect(
        printTemplateService.createOrUpdateActiveTemplate,
      ).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'SCHET',
        '<div>{{organizationName}}</div>',
      );
    });
  });

  describe('reconcile_payments', () => {
    it('wraps the proposals into a ToolOutput result', async () => {
      const { provider, reconciliationService } = buildProvider();

      const output = await provider.executeStaticTool(
        'reconcile_payments',
        { organizationId: ORGANIZATION_ID },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            paymentId: 'payment-1',
            candidates: expect.arrayContaining([
              expect.objectContaining({ invoiceId: 'invoice-1', score: 2 }),
            ]),
          }),
        ]),
      );
      expect(
        reconciliationService.getReconciliationProposals,
      ).toHaveBeenCalledWith(WORKSPACE_ID, ORGANIZATION_ID);
    });

    it('rejects when the role lacks canReadObjectRecords', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'reconcile_payments',
          { organizationId: ORGANIZATION_ID },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirm_reconciliation', () => {
    it('confirms the link once the permission check passes', async () => {
      const { provider, reconciliationService } = buildProvider();

      const output = await provider.executeStaticTool(
        'confirm_reconciliation',
        { paymentId: 'payment-1', invoiceId: 'invoice-1' },
        context,
      );

      expect(output.success).toBe(true);
      expect(reconciliationService.confirmReconciliation).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'payment-1',
        'invoice-1',
      );
    });

    it('rejects when the role lacks canUpdateObjectRecords', async () => {
      const { provider, reconciliationService } = buildProvider({
        permissionDenied: true,
      });

      await expect(
        provider.executeStaticTool(
          'confirm_reconciliation',
          { paymentId: 'payment-1', invoiceId: 'invoice-1' },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(
        reconciliationService.confirmReconciliation,
      ).not.toHaveBeenCalled();
    });
  });

  describe('kudir', () => {
    it('wraps the КУДиР data into a ToolOutput result', async () => {
      const { provider, kudirService } = buildProvider();

      const output = await provider.executeStaticTool(
        'kudir',
        { organizationId: ORGANIZATION_ID, year: 2026 },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          organizationName: 'ООО «Ромашка»',
          totalIncome: 122000,
          totalExpense: 0,
          entries: expect.arrayContaining([
            expect.objectContaining({ seq: 1, income: 122000 }),
          ]),
        }),
      );
      expect(kudirService.getKudirData).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        2026,
      );
    });

    it('rejects when the role lacks canReadObjectRecords', async () => {
      const { provider, kudirService } = buildProvider({
        permissionDenied: true,
      });

      await expect(
        provider.executeStaticTool(
          'kudir',
          { organizationId: ORGANIZATION_ID, year: 2026 },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(kudirService.getKudirData).not.toHaveBeenCalled();
    });
  });
});
