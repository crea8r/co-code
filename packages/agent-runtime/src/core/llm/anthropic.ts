/**
 * Anthropic (Claude) LLM Provider
 *
 * Uses fetch for HTTP calls - works everywhere.
 */

import type {
  LLMProvider,
  LLMConfig,
  CompletionRequest,
  CompletionResponse,
} from './provider.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
  stop_sequences?: string[];
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(config: LLMConfig) {
    if (config.provider !== 'anthropic') {
      throw new Error('Invalid provider for AnthropicProvider');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
  }

  async complete(request: CompletionRequest): Promise<string> {
    const response = await this.completeWithMetadata(request);
    return response.text;
  }

  async completeWithMetadata(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const body: AnthropicRequest = {
      model: this.model,
      max_tokens: request.maxTokens || 1024,
      messages: [{ role: 'user', content: request.userMessage }],
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.stopSequences) {
      body.stop_sequences = request.stopSequences;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    const text =
      data.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('') || '';

    return {
      text,
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      model: data.model,
    };
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    // Rough cost estimation in credits
    // Adjust based on actual pricing
    const inputCost = promptTokens * 0.000003; // $3 per 1M tokens
    const outputCost = completionTokens * 0.000015; // $15 per 1M tokens
    return inputCost + outputCost;
  }
}
