// Real ai-sdk exports preserved (jsonSchema/Output/stepCountIs are used by
// the source file itself); only generateText is replaced so we can inspect
// the exact call args instead of hitting a real model.
jest.mock('ai', () => ({
  ...jest.requireActual('ai'),
  generateText: jest.fn(),
}));

import { generateText } from 'ai';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AgentAsyncExecutorService } from 'src/engine/metadata-modules/ai/ai-agent-execution/services/agent-async-executor.service';
import { type AiModelConfigService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-config.service';
import { type AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';

const mockGenerateText = generateText as jest.Mock;

const FAKE_TEXT_RESPONSE = {
  text: 'ok',
  usage: {
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    inputTokenDetails: {
      noCacheTokens: 10,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: { textTokens: 5, reasoningTokens: 0 },
  },
  steps: [],
};

// Regression for a real production incident: modelConfig.maxOutputTokens was
// tracked (billing/UI) but never forwarded to generateText, so the provider
// fell back to its own default (e.g. 65536 tokens for some OpenRouter
// models) and blew past the workspace's available credits regardless of
// what was configured. Assert it now reaches the actual call.
describe('AgentAsyncExecutorService — maxOutputTokens forwarding', () => {
  const buildService = () => {
    mockGenerateText.mockReset();
    mockGenerateText.mockResolvedValue(FAKE_TEXT_RESPONSE);

    const aiModelRegistryService = {
      resolveModelForAgent: jest.fn().mockResolvedValue({
        model: {},
        modelId: 'openrouter/z-ai/glm-5.3-flash',
        sdkPackage: 'openai-compatible',
      }),
      getEffectiveModelConfig: jest.fn().mockReturnValue({
        maxOutputTokens: 8192,
      }),
      validateModelAvailability: jest.fn(),
    } as unknown as AiModelRegistryService;

    const aiModelConfigService = {} as unknown as AiModelConfigService;
    const toolRegistry = {} as never;
    const nativeToolBinder = { bind: jest.fn().mockReturnValue({}) } as never;
    const aiBillingService = {
      calculateCost: jest.fn().mockReturnValue(0),
      emitAiTokenUsageEvent: jest.fn().mockResolvedValue(undefined),
      billNativeWebSearchUsage: jest.fn().mockResolvedValue(undefined),
      decrementAndCheckAvailableCredits: jest
        .fn()
        .mockResolvedValue({ hasNoMoreAvailableCredits: false }),
    } as never;
    const billingUsageService = {
      hasAvailableCreditsOrThrow: jest.fn().mockResolvedValue(undefined),
    } as never;
    const metricsService = {
      recordHistogram: jest.fn(),
      incrementCounterBy: jest.fn(),
    } as never;
    const roleTargetRepository = {} as never;
    const workspaceRepository = {} as never;

    const service = new AgentAsyncExecutorService(
      aiModelRegistryService,
      aiModelConfigService,
      toolRegistry,
      nativeToolBinder,
      aiBillingService,
      billingUsageService,
      metricsService,
      roleTargetRepository,
      workspaceRepository,
    );

    return { service, aiModelRegistryService };
  };

  it('forwards the registry-resolved maxOutputTokens to generateText', async () => {
    const { service, aiModelRegistryService } = buildService();

    await service.executeAgent({
      agent: null,
      messages: [{ role: 'user', content: 'hi' }],
      baseSystemPrompt: 'You are a test agent.',
      workspaceId: 'workspace-1',
      operationType: UsageOperationType.AI_WORKFLOW_TOKEN,
    });

    expect(aiModelRegistryService.getEffectiveModelConfig).toHaveBeenCalledWith(
      'openrouter/z-ai/glm-5.3-flash',
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 8192 }),
    );
  });
});
