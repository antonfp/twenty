// Real ai-sdk exports preserved (convertToModelMessages/stepCountIs/etc are
// used by the source file itself); only streamText is replaced so we can
// inspect the exact call args instead of hitting a real model. Counterpart
// to agent-async-executor.service.spec.ts, which covers the generateText
// (non-streaming) call pattern — this covers the streamText (streaming)
// pattern used by the chat surface.
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  streamText: jest.fn(),
}));

import { streamText } from 'ai';
import {
  ChatExecutionService,
  type ChatExecutionOptions,
} from 'src/engine/metadata-modules/ai/ai-chat/services/chat-execution.service';
import { type AgentActorContextService } from 'src/engine/metadata-modules/ai/ai-agent-execution/services/agent-actor-context.service';
import { type AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';

const mockStreamText = streamText as jest.Mock;

// Regression for the same production incident as
// agent-async-executor.service.spec.ts: modelConfig.maxOutputTokens must
// reach the actual streamText call, not just be tracked for billing/UI.
describe('ChatExecutionService — maxOutputTokens forwarding', () => {
  const buildService = () => {
    mockStreamText.mockReset();
    mockStreamText.mockReturnValue({ usage: {}, steps: [] });

    const agentActorContextService = {
      buildUserAndAgentActorContext: jest.fn().mockResolvedValue({
        actorContext: {},
        roleId: 'role-1',
        userId: 'user-1',
        userWorkspaceId: 'user-workspace-1',
        userContext: {
          firstName: 'Tim',
          lastName: 'Apple',
          jobTitle: null,
          locale: 'en',
          timezone: 'UTC',
        },
      }),
    } as unknown as AgentActorContextService;

    const aiModelRegistryService = {
      validateModelAvailability: jest.fn(),
      resolveModelForAgent: jest.fn().mockResolvedValue({
        model: {},
        modelId: 'openrouter/z-ai/glm-5.3-flash',
        sdkPackage: 'openai-compatible',
      }),
      getEffectiveModelConfig: jest.fn().mockReturnValue({
        maxOutputTokens: 4096,
        contextWindowTokens: 100_000,
        modalities: [],
      }),
    } as unknown as AiModelRegistryService;

    const toolRegistry = {
      buildToolIndex: jest.fn().mockResolvedValue([]),
      getToolsByName: jest.fn().mockResolvedValue({}),
    } as never;
    const skillService = {
      findAllFlatSkills: jest.fn().mockResolvedValue([]),
    } as never;
    const aiBillingService = {
      calculateCost: jest.fn().mockReturnValue(0),
      emitAiTokenUsageEvent: jest.fn().mockResolvedValue(undefined),
      billNativeWebSearchUsage: jest.fn().mockResolvedValue(undefined),
      decrementAndCheckAvailableCredits: jest
        .fn()
        .mockResolvedValue({ hasNoMoreAvailableCredits: false }),
    } as never;
    const workspaceDomainsService = {} as never;
    const codeInterpreterService = {
      isEnabled: jest.fn().mockReturnValue(false),
    } as never;
    const exceptionHandlerService = {
      captureExceptions: jest.fn(),
    } as never;
    const nativeToolBinder = { bind: jest.fn().mockReturnValue({}) } as never;
    const messagePruningService = {
      pruneIfOverContextWindowLimit: jest.fn().mockReturnValue({
        messages: [],
        wasPruned: false,
        isStillOverLimit: false,
      }),
    } as never;
    const metricsService = {
      recordHistogram: jest.fn(),
      incrementCounterBy: jest.fn(),
    } as never;

    const service = new ChatExecutionService(
      toolRegistry,
      skillService,
      aiModelRegistryService,
      aiBillingService,
      agentActorContextService,
      workspaceDomainsService,
      codeInterpreterService,
      exceptionHandlerService,
      nativeToolBinder,
      messagePruningService,
      metricsService,
    );

    return { service, aiModelRegistryService };
  };

  it('forwards the registry-resolved maxOutputTokens to streamText', async () => {
    const { service, aiModelRegistryService } = buildService();

    const options: ChatExecutionOptions = {
      workspace: { id: 'workspace-1', smartModel: 'default-model' } as never,
      userWorkspaceId: 'user-workspace-1',
      messages: [],
      browsingContext: null,
      conversationSizeTokens: 0,
    };

    await service.streamChat(options);

    expect(aiModelRegistryService.getEffectiveModelConfig).toHaveBeenCalledWith(
      'openrouter/z-ai/glm-5.3-flash',
    );
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 4096 }),
    );
  });
});
