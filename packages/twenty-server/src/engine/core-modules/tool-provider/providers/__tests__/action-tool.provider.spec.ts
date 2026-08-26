import { FieldActorSource } from 'twenty-shared/types';

import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { ActionToolProvider } from 'src/engine/core-modules/tool-provider/providers/action-tool.provider';
import { type ErpAgentToolService } from 'src/engine/core-modules/tool-provider/providers/erp-agent-tool.service';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ROLE_ID = 'role-id';

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

// Regression for a real production bug: post_document/cancel_document/
// trial_balance are delegated to ErpAgentToolService (same ToolCategory.ACTION
// as this provider's own generic tools). ToolExecutorService.dispatchStaticTool
// resolves exactly one provider per category, so this provider — the one
// dispatch actually reaches — must both list AND execute them, not just list.
describe('ActionToolProvider — ERP tool delegation', () => {
  const buildProvider = () => {
    const stubTool = {
      description: 'stub',
      execute: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'stub-ok' }),
    };
    const erpAgentToolService = {
      ownsTool: jest.fn((toolName: string) =>
        ['post_document', 'cancel_document', 'trial_balance'].includes(
          toolName,
        ),
      ),
      generateDescriptors: jest.fn().mockResolvedValue([
        {
          name: 'trial_balance',
          label: 'ОСВ',
          description: 'Оборотно-сальдовая ведомость',
          category: 'ACTION',
          executionRef: { kind: 'static', toolId: 'trial_balance' },
        },
        {
          name: 'post_document',
          label: 'Провести документ',
          description: 'Post a document',
          category: 'ACTION',
          executionRef: { kind: 'static', toolId: 'post_document' },
        },
        {
          name: 'cancel_document',
          label: 'Отменить проведение',
          description: 'Cancel a document',
          category: 'ACTION',
          executionRef: { kind: 'static', toolId: 'cancel_document' },
        },
      ]),
      executeStaticTool: jest.fn().mockResolvedValue({
        success: true,
        message: 'ОСВ: 1 счетов с оборотами за период.',
        result: { rows: [], totals: {} },
      } satisfies ToolOutput),
    } as unknown as ErpAgentToolService;

    const permissionsService = {
      hasToolPermission: jest.fn().mockResolvedValue(false),
    };
    const codeInterpreterService = {
      isEnabled: jest.fn().mockReturnValue(false),
    };
    const i18nService = {
      translateMessage: jest.fn(({ messageId }) => messageId),
    };

    const provider = new ActionToolProvider(
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      stubTool as never,
      codeInterpreterService as never,
      permissionsService as never,
      i18nService as never,
      erpAgentToolService,
    );

    return { provider, erpAgentToolService, stubTool };
  };

  it('lists trial_balance/post_document/cancel_document in generateDescriptors', async () => {
    const { provider } = buildProvider();

    const descriptors = await provider.generateDescriptors(context, {
      includeSchemas: false,
    });

    expect(descriptors.map((descriptor) => descriptor.name)).toEqual(
      expect.arrayContaining([
        'trial_balance',
        'post_document',
        'cancel_document',
      ]),
    );
  });

  it('executes trial_balance via ErpAgentToolService instead of throwing "Unknown action tool"', async () => {
    const { provider, erpAgentToolService } = buildProvider();

    const output = await provider.executeStaticTool(
      'trial_balance',
      { organizationId: 'org-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' },
      context,
    );

    expect(output.success).toBe(true);
    expect(erpAgentToolService.executeStaticTool).toHaveBeenCalledWith(
      'trial_balance',
      { organizationId: 'org-1', dateFrom: '2026-08-01', dateTo: '2026-08-31' },
      context,
    );
  });

  it('still throws Unknown action tool for a name nobody owns', async () => {
    const { provider } = buildProvider();

    await expect(
      provider.executeStaticTool('not_a_real_tool', {}, context),
    ).rejects.toThrow('Unknown action tool "not_a_real_tool"');
  });

  // Task 6 parked minor: the delegation refactor (erpAgentToolService.ownsTool
  // check added ahead of the toolMap lookup) must not swallow the pre-existing
  // generic ACTION tools it now sits in front of — a tool nobody owns via ERP
  // delegation still reaches toolMap.get() and its own execute().
  it('still executes a pre-existing generic ACTION tool (search_help_center) after the ERP delegation refactor', async () => {
    const { provider, erpAgentToolService, stubTool } = buildProvider();

    const output = await provider.executeStaticTool(
      'search_help_center',
      { query: 'how to post an invoice' },
      context,
    );

    expect(output).toEqual({ success: true, message: 'stub-ok' });
    expect(stubTool.execute).toHaveBeenCalledWith(
      { query: 'how to post an invoice' },
      {
        workspaceId: WORKSPACE_ID,
        userId: undefined,
        userWorkspaceId: undefined,
        threadId: undefined,
        onCodeExecutionUpdate: undefined,
      },
    );
    expect(erpAgentToolService.executeStaticTool).not.toHaveBeenCalled();
  });
});
