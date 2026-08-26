import { Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { ToolCategory } from 'twenty-shared/ai';

import {
  CANCEL_DOCUMENT_TOOL_NAME,
  createCancelDocumentTool,
} from 'src/engine/api/mcp/tools/cancel-document.tool';
import {
  POST_DOCUMENT_TOOL_NAME,
  createPostDocumentTool,
} from 'src/engine/api/mcp/tools/post-document.tool';
import {
  TRIAL_BALANCE_TOOL_NAME,
  createTrialBalanceTool,
} from 'src/engine/api/mcp/tools/trial-balance.tool';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
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
// ERPilot-ассистент, has a route to post/cancel a document or read the ОСВ,
// and would be tempted to fall back to a generic record-update tool for
// docStatus (exactly what the ruling forbids). Reuses the SAME factories and
// the SAME ErpObjectPermissionGuardService checks as the MCP surface — no
// duplicated business logic, just adapted to ToolProviderContext/roleId.
//
// NOT a standalone ToolProvider: ToolExecutorService.dispatchStaticTool picks
// exactly ONE provider per ToolCategory (`providers.find(p => p.category ===
// descriptor.category)`) — every category in the registry is a strict 1:1
// with its provider. A second provider also claiming ToolCategory.ACTION
// listed fine (descriptors merge) but could never be REACHED at execution
// time: dispatch always resolved to the first ACTION provider (ActionToolProvider)
// and threw "Unknown action tool" for these three names. Fix: this class is a
// plain injectable owned BY ActionToolProvider, which delegates to it for
// these three tool names — one provider, one category, as the dispatcher
// assumes.
//
// lookup_party_by_inn and import_bank_statement stay MCP-only for now: an
// external lookup and a file-upload input don't fit this chat tool loop the
// same way and no scenario in this task needed them — see
// docs/erp-design/mcp-surface.md.
export const ERP_AGENT_TOOL_NAMES: readonly string[] = [
  POST_DOCUMENT_TOOL_NAME,
  CANCEL_DOCUMENT_TOOL_NAME,
  TRIAL_BALANCE_TOOL_NAME,
];

@Injectable()
export class ErpAgentToolService {
  constructor(
    private readonly postingService: PostingService,
    private readonly trialBalanceService: TrialBalanceService,
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
    };
  }
}
