/**
 * Anthropic LLM Provider
 *
 * Implementation of Task 21 for Anthropic Claude models.
 * Uses the official Anthropic SDK for robust tool support.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  Model,
  CompletionRequest,
  CompletionResponse,
  CostEstimate,
  Tool,
  ToolCall,
} from './provider.js';

export class AnthropicProvider implements LLMProvider {
  readonly id = 'anthropic';
  private client: Anthropic;

  private static MODELS: Model[] = [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      tier: 'standard',
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
      maxContext: 200000,
      strengths: ['reasoning', 'coding', 'speed'],
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      tier: 'expensive',
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.075,
      maxContext: 200000,
      strengths: ['reasoning', 'nuance'],
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      tier: 'cheap',
      inputCostPer1k: 0.001,
      outputCostPer1k: 0.005,
      maxContext: 200000,
      strengths: ['speed'],
    },
  ];

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  listModels(): Model[] {
    return AnthropicProvider.MODELS;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = AnthropicProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

    const anthropicTools: Anthropic.Tool[] | undefined = request.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Tool.InputSchema,
    }));

    const response = await this.client.messages.create({
      model: request.model,
      system: request.systemPrompt,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      messages: request.messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          if (typeof m.content === 'string') {
            return {
              role: m.role as 'user' | 'assistant',
              content: m.content,
            } as Anthropic.MessageParam;
          }
          // Handle tool results
          return {
            role: 'user',
            content: m.content.map((res) => ({
              type: 'tool_result' as const,
              tool_use_id: res.toolCallId,
              content: res.result,
            })),
          } as Anthropic.MessageParam;
        }),
      tools: anthropicTools,
    });

    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, any>,
        });
      }
    }

    const usage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };

    const cost =
      (usage.inputTokens / 1000) * model.inputCostPer1k +
      (usage.outputTokens / 1000) * model.outputCostPer1k;

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      model: request.model,
      cost,
    };
  }

  estimateCost(request: CompletionRequest): CostEstimate {
    const model = AnthropicProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

    // Very rough estimation for now
    const charCount =
      request.systemPrompt.length +
      request.messages.reduce((acc, m) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0);
    const inputTokens = Math.ceil(charCount / 4);
    const outputTokens = request.maxTokens || 1000;

    const estimatedCost =
      (inputTokens / 1000) * model.inputCostPer1k + (outputTokens / 1000) * model.outputCostPer1k;

    return {
      inputTokens,
      outputTokens,
      estimatedCost,
      confidence: 'low',
    };
  }
}
