/**
 * OpenAI LLM Provider
 *
 * Implementation of Task 21 for OpenAI models.
 * Uses official OpenAI SDK and Chat Completions API.
 */

import OpenAI from 'openai';
import {
  LLMProvider,
  Model,
  CompletionRequest,
  CompletionResponse,
  CostEstimate,
  Tool,
  ToolCall,
} from './provider.js';

export class OpenAIProvider implements LLMProvider {
  readonly id = 'openai';
  private client: OpenAI;

  private static MODELS: Model[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      tier: 'standard',
      inputCostPer1k: 0.0025,
      outputCostPer1k: 0.01,
      maxContext: 128000,
      strengths: ['reasoning', 'speed', 'multimodal'],
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o mini',
      provider: 'openai',
      tier: 'cheap',
      inputCostPer1k: 0.00015,
      outputCostPer1k: 0.0006,
      maxContext: 128000,
      strengths: ['speed', 'cheap'],
    },
    {
      id: 'o1-preview',
      name: 'o1 Preview',
      provider: 'openai',
      tier: 'expensive',
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.06,
      maxContext: 128000,
      strengths: ['complex reasoning'],
    },
  ];

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  listModels(): Model[] {
    return OpenAIProvider.MODELS;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = OpenAIProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] | undefined = request.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map((m) => {
        if (typeof m.content === 'string') {
          return {
            role: m.role as any,
            content: m.content,
          };
        }
        // Handle tool results
        return {
          role: 'user', // Simplified mapping for now
          content: m.content.map((res) => `Tool result (${res.toolCallId}): ${res.result}`).join('\n'),
        };
      }) as any,
    ];

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages,
      tools: openaiTools,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
    });

    const choice = response.choices[0];
    const text = choice.message.content || '';
    const toolCalls: ToolCall[] = [];

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        if (tc.type === 'function') {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        }
      }
    }

    const usage = {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
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
    const model = OpenAIProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

    // Very rough estimation
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
