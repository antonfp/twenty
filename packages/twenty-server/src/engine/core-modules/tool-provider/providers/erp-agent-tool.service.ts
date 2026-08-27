import { Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { ToolCategory } from 'twenty-shared/ai';

import {
  ACCOUNT_CARD_TOOL_NAME,
  createAccountCardTool,
} from 'src/engine/api/mcp/tools/account-card.tool';
import {
  BALANCE_SHEET_TOOL_NAME,
  createBalanceSheetTool,
} from 'src/engine/api/mcp/tools/balance-sheet.tool';
import {
  CANCEL_DOCUMENT_TOOL_NAME,
  createCancelDocumentTool,
} from 'src/engine/api/mcp/tools/cancel-document.tool';
import {
  GET_PRINT_TEMPLATE_TOOL_NAME,
  createGetPrintTemplateTool,
} from 'src/engine/api/mcp/tools/get-print-template.tool';
import {
  createIncomeStatementTool,
  INCOME_STATEMENT_TOOL_NAME,
} from 'src/engine/api/mcp/tools/income-statement.tool';
import {
  POST_DOCUMENT_TOOL_NAME,
  createPostDocumentTool,
} from 'src/engine/api/mcp/tools/post-document.tool';
import {
  RENDER_PRINT_PREVIEW_TOOL_NAME,
  createRenderPrintPreviewTool,
} from 'src/engine/api/mcp/tools/render-print-preview.tool';
import {
  TRIAL_BALANCE_TOOL_NAME,
  createTrialBalanceTool,
} from 'src/engine/api/mcp/tools/trial-balance.tool';
import {
  UPDATE_PRINT_TEMPLATE_TOOL_NAME,
  createUpdatePrintTemplateTool,
} from 'src/engine/api/mcp/tools/update-print-template.tool';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { executeToolFromToolSet } from 'src/engine/core-modules/tool-provider/utils/execute-tool-from-tool-set.util';
import { toolSetToDescriptors } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';

// Bridges the ERP domain tools that already ship over the raw MCP protocol
// (see McpProtocolService.buildMcpToolSet) into ToolRegistryService, so an
// internal AI agent/chat (ChatExecutionService, AgentAsyncExecutorService via
// runAgent) can actually call them. Without this, those tools are reachable
// only by an external MCP client — no internal agent, including
// ERPilot-ассистент, has a route to post/cancel a document, read the ОСВ, or
// customize a print template, and would be tempted to fall back to a generic
// record-update tool for docStatus (exactly what the ruling forbids), or to
// generic printTemplate CRUD without ever seeing the built-in fallback/
// placeholder list get_print_template and render_print_preview expose.
// Reuses the SAME factories and the SAME ErpObjectPermissionGuardService
// checks as the MCP surface — no duplicated business logic, just adapted to
// ToolProviderContext/roleId.
//
// NOT a standalone ToolProvider: ToolExecutorService.dispatchStaticTool picks
// exactly ONE provider per ToolCategory (`providers.find(p => p.category ===
// descriptor.category)`) — every category in the registry is a strict 1:1
// with its provider. A second provider also claiming ToolCategory.ACTION
// listed fine (descriptors merge) but could never be REACHED at execution
// time: dispatch always resolved to the first ACTION provider (ActionToolProvider)
// and threw "Unknown action tool" for these three names. Fix: this class is a
// plain injectable owned BY ActionToolProvider, which delegates to it for
// these tool names — one provider, one category, as the dispatcher assumes.
//
// lookup_party_by_inn and import_bank_statement stay MCP-only for now: an
// external lookup and a file-upload input don't fit this chat tool loop the
// same way and no scenario in this task needed them — see
// docs/erp-design/mcp-surface.md.
export const ERP_AGENT_TOOL_NAMES: readonly string[] = [
  POST_DOCUMENT_TOOL_NAME,
  CANCEL_DOCUMENT_TOOL_NAME,
  TRIAL_BALANCE_TOOL_NAME,
  ACCOUNT_CARD_TOOL_NAME,
  BALANCE_SHEET_TOOL_NAME,
  INCOME_STATEMENT_TOOL_NAME,
  GET_PRINT_TEMPLATE_TOOL_NAME,
  UPDATE_PRINT_TEMPLATE_TOOL_NAME,
  RENDER_PRINT_PREVIEW_TOOL_NAME,
];

@Injectable()
export class ErpAgentToolService {
  constructor(
    private readonly postingService: PostingService,
    private readonly trialBalanceService: TrialBalanceService,
    private readonly accountCardService: AccountCardService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly incomeStatementService: IncomeStatementService,
    private readonly printTemplateService: PrintTemplateService,
    private readonly salesInvoicePrintService: SalesInvoicePrintService,
    private readonly salesShipmentPrintService: SalesShipmentPrintService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
  ) {}

  ownsTool(toolName: string): boolean {
    return ERP_AGENT_TOOL_NAMES.includes(toolName);
  }

  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    return toolSetToDescriptors(
      this.buildToolSet(context),
      ToolCategory.ACTION,
      {
        includeSchemas: options?.includeSchemas ?? true,
        icon: 'IconFileInvoice',
      },
    );
  }

  async executeStaticTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    return executeToolFromToolSet(
      this.buildToolSet(context),
      toolName,
      args,
      ToolCategory.ACTION,
    );
  }

  private buildToolSet(context: ToolProviderContext): ToolSet {
    const assertCanUpdateObjectRecords = (objectNameSingular: string) =>
      this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
        workspaceId: context.workspaceId,
        roleId: context.roleId,
        objectNameSingular,
      });
    const assertCanReadObjectRecords = (objectNameSingular: string) =>
      this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
        workspaceId: context.workspaceId,
        roleId: context.roleId,
        objectNameSingular,
      });

    const trialBalanceTool = createTrialBalanceTool(
      this.trialBalanceService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );
    const accountCardTool = createAccountCardTool(
      this.accountCardService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );
    const balanceSheetTool = createBalanceSheetTool(
      this.balanceSheetService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );
    const incomeStatementTool = createIncomeStatementTool(
      this.incomeStatementService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );
    const getPrintTemplateTool = createGetPrintTemplateTool(
      this.printTemplateService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );
    const renderPrintPreviewTool = createRenderPrintPreviewTool(
      this.printTemplateService,
      this.salesInvoicePrintService,
      this.salesShipmentPrintService,
      context.workspaceId,
      assertCanReadObjectRecords,
    );

    return {
      [POST_DOCUMENT_TOOL_NAME]: createPostDocumentTool(
        this.postingService,
        context.workspaceId,
        assertCanUpdateObjectRecords,
      ),
      [CANCEL_DOCUMENT_TOOL_NAME]: createCancelDocumentTool(
        this.postingService,
        context.workspaceId,
        assertCanUpdateObjectRecords,
      ),
      // trial_balance returns { rows, totals }, not the { success, message }
      // shape ToolOutput expects (learn_tools/execute_tool's success check
      // reads `.success`) — wrap it, same data, without touching the MCP
      // factory's return type.
      [TRIAL_BALANCE_TOOL_NAME]: {
        description: trialBalanceTool.description,
        inputSchema: trialBalanceTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof trialBalanceTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await trialBalanceTool.execute(toolArgs);

          return {
            success: true,
            message: `ОСВ: ${result.rows.length} счетов с оборотами за период.`,
            result,
          };
        },
      },
      // Same wrapping reason as trial_balance above: raw data result, not
      // {success, message}.
      [ACCOUNT_CARD_TOOL_NAME]: {
        description: accountCardTool.description,
        inputSchema: accountCardTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof accountCardTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await accountCardTool.execute(toolArgs);

          return {
            success: true,
            message: `Карточка счёта ${result.accountCode}: ${result.rows.length} проводок за период.`,
            result,
          };
        },
      },
      // Same wrapping reason as trial_balance above: raw data result, not
      // {success, message} — балансовый тул тоже.
      [BALANCE_SHEET_TOOL_NAME]: {
        description: balanceSheetTool.description,
        inputSchema: balanceSheetTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof balanceSheetTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await balanceSheetTool.execute(toolArgs);

          return {
            success: true,
            message: `Баланс на ${result.reportDate}: актив/пассив = ${result.totalAssets.current} коп.`,
            result,
          };
        },
      },
      [INCOME_STATEMENT_TOOL_NAME]: {
        description: incomeStatementTool.description,
        inputSchema: incomeStatementTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof incomeStatementTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await incomeStatementTool.execute(toolArgs);

          return {
            success: true,
            message: `ОФР за ${result.dateFrom}—${result.dateTo}: ${result.lines.length} строк.`,
            result,
          };
        },
      },
      // Same wrapping reason as trial_balance above: raw data result, not
      // {success, message}.
      [GET_PRINT_TEMPLATE_TOOL_NAME]: {
        description: getPrintTemplateTool.description,
        inputSchema: getPrintTemplateTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof getPrintTemplateTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await getPrintTemplateTool.execute(toolArgs);

          return {
            success: true,
            message: `Шаблон печати ${result.documentType}: ${result.source === 'custom' ? 'кастомный override' : 'встроенный'}.`,
            result,
          };
        },
      },
      // update_print_template already returns {success, id, message} —
      // matches ToolOutput as-is, no wrapping needed (same as post/cancel above).
      [UPDATE_PRINT_TEMPLATE_TOOL_NAME]: createUpdatePrintTemplateTool(
        this.printTemplateService,
        context.workspaceId,
        assertCanUpdateObjectRecords,
      ),
      [RENDER_PRINT_PREVIEW_TOOL_NAME]: {
        description: renderPrintPreviewTool.description,
        inputSchema: renderPrintPreviewTool.inputSchema,
        execute: async (
          toolArgs: Parameters<typeof renderPrintPreviewTool.execute>[0],
        ): Promise<ToolOutput> => {
          const result = await renderPrintPreviewTool.execute(toolArgs);

          return {
            success: true,
            message:
              result.unfilledPlaceholders.length > 0
                ? `Превью отрендерено. Незаполненные плейсхолдеры: ${result.unfilledPlaceholders.join(', ')}.`
                : 'Превью отрендерено.',
            result,
          };
        },
      },
    };
  }
}
