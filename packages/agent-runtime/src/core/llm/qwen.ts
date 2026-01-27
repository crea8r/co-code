/**
 * Qwen LLM Provider
 *
 * Implementation of Task 21 for Qwen models (Alibaba Cloud).
 * Usually OpenAI-compatible.
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

export class QwenProvider implements LLMProvider {
  readonly id = 'qwen';
  private client: OpenAI;

  private static MODELS: Model[] = [
    {
      id: 'qwen-max',
      name: 'Qwen Max',
      provider: 'qwen',
      tier: 'expensive',
      inputCostPer1k: 0.002,
      outputCostPer1k: 0.006,
      maxContext: 32000,
      strengths: ['reasoning', 'versatility'],
    },
    {
      id: 'qwen-plus',
      name: 'Qwen Plus',
      provider: 'qwen',
      tier: 'standard',
      inputCostPer1k: 0.0004,
      outputCostPer1k: 0.0012,
      maxContext: 32000,
      strengths: ['speed', 'balanced'],
    },
    {
      id: 'qwen-turbo',
      name: 'Qwen Turbo',
      provider: 'qwen',
      tier: 'cheap',
      inputCostPer1k: 0.0001,
      outputCostPer1k: 0.0003,
      maxContext: 32000,
      strengths: ['speed', 'cheap'],
    },
  ];

  constructor(apiKey: string, baseUrl: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1') {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  listModels(): Model[] {
    return QwenProvider.MODELS;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = QwenProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

    const openaiTools: OpenAI.Chat.ChatCompletionTool[] | undefined = request.tools?.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((m) => ({
          role: m.role as any,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
      ],
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
    const model = QwenProvider.MODELS.find((m) => m.id === request.model);
    if (!model) throw new Error(`Unknown model: ${request.model}`);

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
