/**
 * Local LLM Provider (Ollama)
 *
 * Implementation of Task 21 for local models using Ollama.
 * Uses OpenAI-compatible endpoint.
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

export class LocalProvider implements LLMProvider {
  readonly id = 'local';
  private client: OpenAI;

  constructor(baseUrl: string = 'http://localhost:11434/v1') {
    // Local providers usually don't need a real API key, but the SDK expects one.
    this.client = new OpenAI({ apiKey: 'ollama', baseURL: baseUrl });
  }

  listModels(): Model[] {
    // In a real scenario, we might poll Ollama's /api/tags
    return [
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        provider: 'local',
        tier: 'free',
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        maxContext: 128000,
        strengths: ['local', 'privacy', 'speed'],
      }
    ];
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
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

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      model: request.model,
      cost: 0, // Local is free
    };
  }

  estimateCost(_request: CompletionRequest): CostEstimate {
    return {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      confidence: 'high',
    };
  }
}
