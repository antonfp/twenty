import { ForbiddenException } from '@nestjs/common';

import { FieldActorSource } from 'twenty-shared/types';

import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { type BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { type IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
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

  const service = new ErpAgentToolService(
    postingService,
    trialBalanceService,
    balanceSheetService,
    incomeStatementService,
    printTemplateService,
    salesInvoicePrintService,
    salesShipmentPrintService,
    erpObjectPermissionGuardService,
  );

  return {
    provider: service,
    postingService,
    trialBalanceService,
    balanceSheetService,
    incomeStatementService,
    printTemplateService,
    salesInvoicePrintService,
    salesShipmentPrintService,
    erpObjectPermissionGuardService,
  };
};

describe('ErpAgentToolService', () => {
  describe('ownsTool', () => {
    it('claims post_document/cancel_document/trial_balance/balance_sheet/income_statement/print tools and nothing else', () => {
      const { provider } = buildProvider();

      expect(provider.ownsTool('post_document')).toBe(true);
      expect(provider.ownsTool('cancel_document')).toBe(true);
      expect(provider.ownsTool('trial_balance')).toBe(true);
      expect(provider.ownsTool('balance_sheet')).toBe(true);
      expect(provider.ownsTool('income_statement')).toBe(true);
      expect(provider.ownsTool('get_print_template')).toBe(true);
      expect(provider.ownsTool('update_print_template')).toBe(true);
      expect(provider.ownsTool('render_print_preview')).toBe(true);
      expect(provider.ownsTool('http_request')).toBe(false);
    });
  });

  describe('generateDescriptors', () => {
    it('exposes post_document, cancel_document, trial_balance, balance_sheet, income_statement and the print tools', async () => {
      const { provider } = buildProvider();

      const descriptors = await provider.generateDescriptors(context, {
        includeSchemas: false,
      });

      expect(descriptors.map((descriptor) => descriptor.name)).toEqual(
        expect.arrayContaining([
          'post_document',
          'cancel_document',
          'trial_balance',
          'balance_sheet',
          'income_statement',
          'get_print_template',
          'update_print_template',
          'render_print_preview',
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
});
