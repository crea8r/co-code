import { describe, expect, it, vi } from 'vitest';
import { runAgenticLoop } from '../agentic/loop.js';
import type {
  CompletionRequest,
  CompletionResponse,
  LLMProvider,
  Model,
  CostEstimate,
  ToolCall,
} from '../llm/provider.js';
import { DEFAULT_BUDGET, DEFAULT_VITALS } from '../../identity/defaults.js';

class MockLLM implements LLMProvider {
  id = 'mock';
  private responses: CompletionResponse[];

  constructor(responses: CompletionResponse[]) {
    this.responses = responses;
  }

  listModels(): Model[] {
    return [
      {
        id: 'mock-model',
        name: 'Mock',
        provider: 'mock',
        tier: 'free',
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        maxContext: 2048,
        strengths: ['testing'],
      },
    ];
  }

  async complete(_request: CompletionRequest): Promise<CompletionResponse> {
    const next = this.responses.shift();
    if (!next) throw new Error('No mock responses left');
    return next;
  }

  estimateCost(_request: CompletionRequest): CostEstimate {
    return {
      inputTokens: 100,
      outputTokens: 100,
      estimatedCost: 0.01,
      confidence: 'low',
    };
  }
}

describe('runAgenticLoop', () => {
  it('returns response when submit_response tool is called', async () => {
    const toolCall: ToolCall = {
      id: 'tool-1',
      name: 'submit_response',
      arguments: { text: 'final answer' },
    };

    const llm = new MockLLM([
      {
        text: '',
        toolCalls: [toolCall],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0.001,
      },
    ]);

    const result = await runAgenticLoop({
      llm,
      model: 'mock-model',
      systemPrompt: 'system',
      userMessage: 'hello',
    });

    expect(result.status).toBe('completed');
    expect(result.responseText).toBe('final answer');
  });

  it('executes tool calls and continues until submit_response', async () => {
    const llm = new MockLLM([
      {
        text: '',
        toolCalls: [
          { id: '1', name: 'echo', arguments: { text: 'hi' } },
        ],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0.001,
      },
      {
        text: '',
        toolCalls: [
          { id: '2', name: 'submit_response', arguments: { text: 'done' } },
        ],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0.001,
      },
    ]);

    const executor = vi.fn(async (call: ToolCall) => `ok:${call.name}`);

    const result = await runAgenticLoop({
      llm,
      model: 'mock-model',
      systemPrompt: 'system',
      userMessage: 'hello',
      toolExecutor: executor,
    });

    expect(executor).toHaveBeenCalledTimes(1);
    expect(result.responseText).toBe('done');
  });

  it('returns rest status when budget is exhausted in negotiation', async () => {
    const llm = new MockLLM([
      {
        text: '',
        toolCalls: [],
        usage: { inputTokens: 0, outputTokens: 0 },
        model: 'mock-model',
        cost: 0,
      },
    ]);

    const budget = { ...DEFAULT_BUDGET, totalBalance: 0, spentThisMonth: 0, spentToday: 0 };

    const result = await runAgenticLoop({
      llm,
      model: 'mock-model',
      systemPrompt: 'system',
      userMessage: 'hello',
      budget,
    });

    expect(result.status).toBe('budget_exhausted');
  });

  it('returns frustrated when submit_response never called', async () => {
    const llm = new MockLLM([
      {
        text: 'draft',
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0,
      },
      {
        text: 'draft again',
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0,
      },
      {
        text: 'still no tool',
        toolCalls: [],
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'mock-model',
        cost: 0,
      },
    ]);

    const vitals = {
      ...DEFAULT_VITALS,
      emotional: { ...DEFAULT_VITALS.emotional },
      waking: { ...DEFAULT_VITALS.waking },
    };
    const baselineStress = DEFAULT_VITALS.emotional.stress;

    const result = await runAgenticLoop({
      llm,
      model: 'mock-model',
      systemPrompt: 'system',
      userMessage: 'hello',
      maxFrustration: 2,
      vitals,
    });

    expect(result.status).toBe('frustrated');
    expect(vitals.emotional.stress).toBeGreaterThan(baselineStress);
  });
});
