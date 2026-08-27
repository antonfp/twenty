import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { type ToolSet, zodSchema } from 'ai';
import { isDefined } from 'twenty-shared/utils';
import { type ActorMetadata, FieldActorSource } from 'twenty-shared/types';

import { JSON_RPC_ERROR_CODE } from 'src/engine/api/mcp/constants/json-rpc-error-code.const';
import { MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-closed-world-read-only-tool-annotations.const';
import {
  buildRegisterWriteToolNamesToExclude,
  MCP_EXCLUDED_TOOL_NAMES,
} from 'src/engine/api/mcp/constants/mcp-excluded-tool-names.const';
import { MCP_EXECUTE_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-execute-tool-annotations.const';
import { MCP_OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS } from 'src/engine/api/mcp/constants/mcp-open-world-read-only-tool-annotations.const';
import { MCP_PROTOCOL_VERSION } from 'src/engine/api/mcp/constants/mcp-protocol-version.const';
import { MCP_SERVER_INFO } from 'src/engine/api/mcp/constants/mcp-server-info.const';
import { JsonRpc } from 'src/engine/api/mcp/dtos/json-rpc';
import { McpInstructionBuilderService } from 'src/engine/api/mcp/services/mcp-instruction-builder.service';
import { McpToolExecutorService } from 'src/engine/api/mcp/services/mcp-tool-executor.service';
import {
  CANCEL_DOCUMENT_TOOL_NAME,
  cancelDocumentInputSchema,
  createCancelDocumentTool,
} from 'src/engine/api/mcp/tools/cancel-document.tool';
import {
  createImportBankStatementTool,
  IMPORT_BANK_STATEMENT_TOOL_NAME,
  importBankStatementInputSchema,
} from 'src/engine/api/mcp/tools/import-bank-statement.tool';
import {
  createListCustomizationSurfaceTool,
  LIST_CUSTOMIZATION_SURFACE_TOOL_NAME,
  listCustomizationSurfaceInputSchema,
} from 'src/engine/api/mcp/tools/list-customization-surface.tool';
import {
  createListObjectMetadataNamesTool,
  LIST_OBJECT_METADATA_NAMES_TOOL_NAME,
  listObjectMetadataNamesInputSchema,
} from 'src/engine/api/mcp/tools/list-object-metadata-names.tool';
import {
  createListWorkflowCapabilitiesTool,
  LIST_WORKFLOW_CAPABILITIES_TOOL_NAME,
  listWorkflowCapabilitiesInputSchema,
} from 'src/engine/api/mcp/tools/list-workflow-capabilities.tool';
import {
  createLookupPartyByInnTool,
  LOOKUP_PARTY_BY_INN_TOOL_NAME,
  lookupPartyByInnInputSchema,
} from 'src/engine/api/mcp/tools/lookup-party-by-inn.tool';
import {
  createPostDocumentTool,
  POST_DOCUMENT_TOOL_NAME,
  postDocumentInputSchema,
} from 'src/engine/api/mcp/tools/post-document.tool';
import {
  CONFIRM_RECONCILIATION_TOOL_NAME,
  confirmReconciliationInputSchema,
  createConfirmReconciliationTool,
} from 'src/engine/api/mcp/tools/confirm-reconciliation.tool';
import {
  createReconcilePaymentsTool,
  RECONCILE_PAYMENTS_TOOL_NAME,
  reconcilePaymentsInputSchema,
} from 'src/engine/api/mcp/tools/reconcile-payments.tool';
import {
  createGetPrintTemplateTool,
  GET_PRINT_TEMPLATE_TOOL_NAME,
  getPrintTemplateInputSchema,
} from 'src/engine/api/mcp/tools/get-print-template.tool';
import {
  createUpdatePrintTemplateTool,
  UPDATE_PRINT_TEMPLATE_TOOL_NAME,
  updatePrintTemplateInputSchema,
} from 'src/engine/api/mcp/tools/update-print-template.tool';
import {
  createRenderPrintPreviewTool,
  RENDER_PRINT_PREVIEW_TOOL_NAME,
  renderPrintPreviewInputSchema,
} from 'src/engine/api/mcp/tools/render-print-preview.tool';
import {
  ACCOUNT_CARD_TOOL_NAME,
  accountCardInputSchema,
  createAccountCardTool,
} from 'src/engine/api/mcp/tools/account-card.tool';
import {
  BALANCE_SHEET_TOOL_NAME,
  balanceSheetInputSchema,
  createBalanceSheetTool,
} from 'src/engine/api/mcp/tools/balance-sheet.tool';
import {
  createIncomeStatementTool,
  INCOME_STATEMENT_TOOL_NAME,
  incomeStatementInputSchema,
} from 'src/engine/api/mcp/tools/income-statement.tool';
import {
  createKudirTool,
  KUDIR_TOOL_NAME,
  kudirInputSchema,
} from 'src/engine/api/mcp/tools/kudir.tool';
import {
  createTrialBalanceTool,
  TRIAL_BALANCE_TOOL_NAME,
  trialBalanceInputSchema,
} from 'src/engine/api/mcp/tools/trial-balance.tool';
import {
  createListSkillsTool,
  LIST_SKILLS_TOOL_NAME,
  listSkillsInputSchema,
} from 'src/engine/api/mcp/tools/list-skills.tool';
import { type McpToolAnnotations } from 'src/engine/api/mcp/types/mcp-tool-annotations.type';
import { wrapJsonRpcResponse } from 'src/engine/api/mcp/utils/wrap-jsonrpc-response.util';
import { ApiKeyRoleService } from 'src/engine/core-modules/api-key/services/api-key-role.service';
import { DadataService } from 'src/engine/core-modules/dadata/services/dadata.service';
import { ErpCustomizationSurfaceService } from 'src/engine/core-modules/erp/services/erp-customization-surface.service';
import { ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
import { BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { BankStatementImportService } from 'src/engine/core-modules/erp-accounting/services/bank-statement-import.service';
import { IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
import { ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';
import { TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { type FlatApiKey } from 'src/engine/core-modules/api-key/types/flat-api-key.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { buildApiKeyAuthContext } from 'src/engine/core-modules/auth/utils/build-api-key-auth-context.util';
import { COMMON_PRELOAD_TOOLS } from 'src/engine/core-modules/tool-provider/constants/common-preload-tools.const';
import { ToolRegistryService } from 'src/engine/core-modules/tool-provider/services/tool-registry.service';
import {
  createLearnToolsTool,
  LEARN_TOOLS_TOOL_NAME,
  learnToolsInputSchema,
} from 'src/engine/core-modules/tool-provider/tools';
import {
  createExecuteToolTool,
  EXECUTE_TOOL_TOOL_NAME,
  executeToolInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/execute-tool.tool';
import {
  createGetToolCatalogTool,
  GET_TOOL_CATALOG_TOOL_NAME,
  getToolCatalogInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/get-tool-catalog.tool';
import {
  createLoadSkillTool,
  LOAD_SKILL_TOOL_NAME,
  loadSkillInputSchema,
} from 'src/engine/core-modules/tool-provider/tools/load-skill.tool';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { SkillService } from 'src/engine/metadata-modules/skill/skill.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';

type McpAnnotatedTool = ToolSet[string] & {
  annotations: McpToolAnnotations;
};

const MCP_PRELOADED_TOOL_ANNOTATIONS: Record<string, McpToolAnnotations> = {
  search_help_center: MCP_OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
};

const annotatePreloadedMcpTools = (toolSet: ToolSet): ToolSet =>
  Object.fromEntries(
    Object.entries(toolSet).map(([name, toolDefinition]) => {
      const annotations = MCP_PRELOADED_TOOL_ANNOTATIONS[name];

      if (!isDefined(annotations)) {
        throw new Error(`Missing MCP annotations for preloaded tool "${name}"`);
      }

      return [
        name,
        {
          ...toolDefinition,
          annotations,
        } as McpAnnotatedTool,
      ];
    }),
  );

@Injectable()
export class McpProtocolService {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly userRoleService: UserRoleService,
    private readonly mcpToolExecutorService: McpToolExecutorService,
    private readonly apiKeyRoleService: ApiKeyRoleService,
    private readonly skillService: SkillService,
    private readonly mcpInstructionBuilderService: McpInstructionBuilderService,
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly postingService: PostingService,
    private readonly erpObjectPermissionGuardService: ErpObjectPermissionGuardService,
    private readonly dadataService: DadataService,
    private readonly trialBalanceService: TrialBalanceService,
    private readonly bankStatementImportService: BankStatementImportService,
    private readonly balanceSheetService: BalanceSheetService,
    private readonly incomeStatementService: IncomeStatementService,
    private readonly accountCardService: AccountCardService,
    private readonly reconciliationService: ReconciliationService,
    private readonly kudirService: KudirService,
    private readonly erpCustomizationSurfaceService: ErpCustomizationSurfaceService,
    private readonly printTemplateService: PrintTemplateService,
    private readonly salesInvoicePrintService: SalesInvoicePrintService,
    private readonly salesShipmentPrintService: SalesShipmentPrintService,
  ) {}

  async handleInitialize(requestId: string | number, workspaceId: string) {
    const instructions =
      await this.mcpInstructionBuilderService.buildInstructions(workspaceId);

    return wrapJsonRpcResponse(requestId, {
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: MCP_SERVER_INFO,
        instructions,
      },
    });
  }

  async getRoleId(
    workspaceId: string,
    userWorkspaceId?: string,
    apiKey?: FlatApiKey,
  ) {
    if (isDefined(apiKey)) {
      return this.apiKeyRoleService.getRoleIdForApiKeyId(
        apiKey.id,
        workspaceId,
      );
    }

    if (!userWorkspaceId) {
      throw new HttpException(
        'User workspace ID missing',
        HttpStatus.FORBIDDEN,
      );
    }

    const roleId = await this.userRoleService.getRoleIdForUserWorkspace({
      workspaceId,
      userWorkspaceId,
    });

    if (!roleId) {
      throw new HttpException('Role ID missing', HttpStatus.FORBIDDEN);
    }

    return roleId;
  }

  private async buildActorContext(
    workspaceId: string,
    userId?: string,
    apiKey?: FlatApiKey,
  ): Promise<ActorMetadata> {
    let actorContext: ActorMetadata = {
      source: FieldActorSource.AGENT,
      workspaceMemberId: null,
      name: 'Agent',
      context: {},
    };

    if (isDefined(apiKey)) {
      actorContext = {
        source: FieldActorSource.AGENT,
        workspaceMemberId: null,
        name: apiKey.name,
        context: {},
      };
    } else if (isDefined(userId)) {
      const { flatWorkspaceMemberMaps } =
        await this.workspaceCacheService.getOrRecompute(workspaceId, [
          'flatWorkspaceMemberMaps',
        ]);
      const workspaceMemberId = flatWorkspaceMemberMaps.idByUserId[userId];
      const workspaceMember = isDefined(workspaceMemberId)
        ? flatWorkspaceMemberMaps.byId[workspaceMemberId]
        : undefined;

      if (isDefined(workspaceMember)) {
        actorContext = {
          source: FieldActorSource.AGENT,
          workspaceMemberId: workspaceMember.id,
          name:
            `${workspaceMember.name?.firstName ?? ''} ${workspaceMember.name?.lastName ?? ''}`.trim() ||
            'Agent',
          context: {},
        };
      }
    }

    return actorContext;
  }

  private async buildMcpToolSet(
    workspace: FlatWorkspace,
    roleId: string,
    options?: {
      authContext?: WorkspaceAuthContext;
      userId?: string;
      userWorkspaceId?: string;
      apiKey?: FlatApiKey;
    },
  ): Promise<ToolSet> {
    const actorContext = await this.buildActorContext(
      workspace.id,
      options?.userId,
      options?.apiKey,
    );

    // Register write-tool names (create_one_gl_entry, ...) resolved live from
    // this workspace's actual namePlural — see mcp-excluded-tool-names.const.ts.
    const { flatObjectMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: workspace.id,
          flatMapsKeys: ['flatObjectMetadataMaps'],
        },
      );
    const excludedToolNames = new Set([
      ...MCP_EXCLUDED_TOOL_NAMES,
      ...buildRegisterWriteToolNamesToExclude(flatObjectMetadataMaps),
    ]);

    const toolContext = {
      workspaceId: workspace.id,
      roleId,
      authContext: options?.authContext,
      userId: options?.userId,
      userWorkspaceId: options?.userWorkspaceId,
      actorContext,
    };

    const preloadedTools = await this.toolRegistry.getToolsByName(
      COMMON_PRELOAD_TOOLS,
      toolContext,
    );

    // Posting/cancelling writes the document's own records, so it requires
    // the same permission as updating that object's records directly; shared
    // with ErpPostingResolver so the check isn't duplicated per caller.
    const assertCanUpdateObjectRecords = (objectNameSingular: string) =>
      this.erpObjectPermissionGuardService.assertCanUpdateObjectRecords({
        workspaceId: workspace.id,
        roleId,
        objectNameSingular,
      });
    // trial_balance only reads glEntry — same permission as the REST print
    // endpoints (canReadObjectRecords), not canUpdateObjectRecords.
    const assertCanReadObjectRecords = (objectNameSingular: string) =>
      this.erpObjectPermissionGuardService.assertCanReadObjectRecords({
        workspaceId: workspace.id,
        roleId,
        objectNameSingular,
      });

    return {
      ...annotatePreloadedMcpTools(preloadedTools),
      [GET_TOOL_CATALOG_TOOL_NAME]: {
        ...createGetToolCatalogTool(this.toolRegistry, workspace.id, roleId, {
          userId: options?.userId,
          userWorkspaceId: options?.userWorkspaceId,
          excludeTools: excludedToolNames,
        }),
        inputSchema: zodSchema(getToolCatalogInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [EXECUTE_TOOL_TOOL_NAME]: {
        ...createExecuteToolTool(this.toolRegistry, toolContext, {
          isToolAllowed: (toolName) => !excludedToolNames.has(toolName),
        }),
        inputSchema: executeToolInputSchema,
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LOAD_SKILL_TOOL_NAME]: {
        ...createLoadSkillTool(
          (names) =>
            this.skillService.findFlatSkillsByNames(names, workspace.id),
          async () => {
            const allSkills = await this.skillService.findAllFlatSkills(
              workspace.id,
            );

            return allSkills.map((skill) => skill.name);
          },
        ),
        inputSchema: zodSchema(loadSkillInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LIST_OBJECT_METADATA_NAMES_TOOL_NAME]: {
        ...createListObjectMetadataNamesTool(
          this.flatEntityMapsCacheService,
          workspace.id,
        ),
        inputSchema: zodSchema(listObjectMetadataNamesInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LIST_CUSTOMIZATION_SURFACE_TOOL_NAME]: {
        ...createListCustomizationSurfaceTool(
          this.erpCustomizationSurfaceService,
          workspace.id,
        ),
        inputSchema: zodSchema(listCustomizationSurfaceInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      // Read-only, ungated (same reasoning as LIST_CUSTOMIZATION_SURFACE
      // above): this describes the workflow ENGINE's schema, not workspace
      // data, and the agent needs it to plan a valid create_complete_workflow
      // call before ever reaching the WORKFLOWS-gated write path.
      [LIST_WORKFLOW_CAPABILITIES_TOOL_NAME]: {
        ...createListWorkflowCapabilitiesTool(),
        inputSchema: zodSchema(listWorkflowCapabilitiesInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LIST_SKILLS_TOOL_NAME]: {
        ...createListSkillsTool(this.skillService, workspace.id),
        inputSchema: zodSchema(listSkillsInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LEARN_TOOLS_TOOL_NAME]: {
        ...createLearnToolsTool(this.toolRegistry, toolContext, {
          isToolAllowed: (toolName) => !excludedToolNames.has(toolName),
        }),
        inputSchema: zodSchema(learnToolsInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [POST_DOCUMENT_TOOL_NAME]: {
        ...createPostDocumentTool(
          this.postingService,
          workspace.id,
          assertCanUpdateObjectRecords,
        ),
        inputSchema: zodSchema(postDocumentInputSchema),
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [CANCEL_DOCUMENT_TOOL_NAME]: {
        ...createCancelDocumentTool(
          this.postingService,
          workspace.id,
          assertCanUpdateObjectRecords,
        ),
        inputSchema: zodSchema(cancelDocumentInputSchema),
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [LOOKUP_PARTY_BY_INN_TOOL_NAME]: {
        ...createLookupPartyByInnTool(this.dadataService),
        inputSchema: zodSchema(lookupPartyByInnInputSchema),
        annotations: MCP_OPEN_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [TRIAL_BALANCE_TOOL_NAME]: {
        ...createTrialBalanceTool(
          this.trialBalanceService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(trialBalanceInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [ACCOUNT_CARD_TOOL_NAME]: {
        ...createAccountCardTool(
          this.accountCardService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(accountCardInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [RECONCILE_PAYMENTS_TOOL_NAME]: {
        ...createReconcilePaymentsTool(
          this.reconciliationService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(reconcilePaymentsInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [CONFIRM_RECONCILIATION_TOOL_NAME]: {
        ...createConfirmReconciliationTool(
          this.reconciliationService,
          workspace.id,
          assertCanUpdateObjectRecords,
        ),
        inputSchema: zodSchema(confirmReconciliationInputSchema),
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [BALANCE_SHEET_TOOL_NAME]: {
        ...createBalanceSheetTool(
          this.balanceSheetService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(balanceSheetInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [INCOME_STATEMENT_TOOL_NAME]: {
        ...createIncomeStatementTool(
          this.incomeStatementService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(incomeStatementInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [KUDIR_TOOL_NAME]: {
        ...createKudirTool(
          this.kudirService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(kudirInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [IMPORT_BANK_STATEMENT_TOOL_NAME]: {
        ...createImportBankStatementTool(
          this.bankStatementImportService,
          workspace.id,
          assertCanUpdateObjectRecords,
        ),
        inputSchema: zodSchema(importBankStatementInputSchema),
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [GET_PRINT_TEMPLATE_TOOL_NAME]: {
        ...createGetPrintTemplateTool(
          this.printTemplateService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(getPrintTemplateInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [UPDATE_PRINT_TEMPLATE_TOOL_NAME]: {
        ...createUpdatePrintTemplateTool(
          this.printTemplateService,
          workspace.id,
          assertCanUpdateObjectRecords,
        ),
        inputSchema: zodSchema(updatePrintTemplateInputSchema),
        annotations: MCP_EXECUTE_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
      [RENDER_PRINT_PREVIEW_TOOL_NAME]: {
        ...createRenderPrintPreviewTool(
          this.printTemplateService,
          this.salesInvoicePrintService,
          this.salesShipmentPrintService,
          workspace.id,
          assertCanReadObjectRecords,
        ),
        inputSchema: zodSchema(renderPrintPreviewInputSchema),
        annotations: MCP_CLOSED_WORLD_READ_ONLY_TOOL_ANNOTATIONS,
      } as McpAnnotatedTool,
    };
  }

  // Returns null for JSON-RPC notifications (no id), which require no response body
  async handleMCPCoreQuery(
    { id, method, params }: JsonRpc,
    {
      workspace,
      userId,
      userWorkspaceId,
      apiKey,
    }: {
      workspace: FlatWorkspace;
      userId?: string;
      userWorkspaceId?: string;
      apiKey: FlatApiKey | undefined;
    },
    sseWriter?: (data: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown> | null> {
    try {
      // JSON-RPC notifications have no id and expect no response
      if (!isDefined(id)) {
        return null;
      }

      if (method === 'initialize') {
        return this.handleInitialize(id, workspace.id);
      }

      if (method === 'ping') {
        return wrapJsonRpcResponse(id, { result: {} });
      }

      if (method === 'prompts/list') {
        return wrapJsonRpcResponse(id, {
          result: { prompts: [] },
        });
      }

      if (method === 'resources/list') {
        return wrapJsonRpcResponse(id, {
          result: { resources: [] },
        });
      }

      if (method !== 'tools/list' && method !== 'tools/call') {
        return wrapJsonRpcResponse(id, {
          error: {
            code: JSON_RPC_ERROR_CODE.METHOD_NOT_FOUND,
            message: `Method '${method}' not found`,
          },
        });
      }

      const roleId = await this.getRoleId(
        workspace.id,
        userWorkspaceId,
        apiKey,
      );

      const authContext = isDefined(apiKey)
        ? buildApiKeyAuthContext({ workspace, apiKey })
        : undefined;

      const toolSet = await this.buildMcpToolSet(workspace, roleId, {
        authContext,
        userId,
        userWorkspaceId,
        apiKey,
      });

      if (method === 'tools/call') {
        if (!params) {
          return wrapJsonRpcResponse(id, {
            error: {
              code: JSON_RPC_ERROR_CODE.INVALID_PARAMS,
              message: 'tools/call requires params with name and arguments',
            },
          });
        }

        return await this.mcpToolExecutorService.handleToolCall(
          id,
          toolSet,
          params,
          sseWriter,
        );
      }

      return this.mcpToolExecutorService.handleToolsListing(id, toolSet);
    } catch (error) {
      if (error instanceof HttpException) {
        return wrapJsonRpcResponse(id ?? 0, {
          error: {
            code: JSON_RPC_ERROR_CODE.SERVER_ERROR,
            message: error.message || 'Request failed',
          },
        });
      }

      return wrapJsonRpcResponse(id ?? 0, {
        error: {
          code: JSON_RPC_ERROR_CODE.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
      });
    }
  }
}
