/**
 * OpenAI LLM Provider (Responses API)
 *
 * Uses fetch for HTTP calls - works everywhere.
 */

import type {
  LLMProvider,
  LLMConfig,
  CompletionRequest,
  CompletionResponse,
} from './provider.js';

interface OpenAIOutputText {
  type: 'output_text' | string;
  text?: string;
}

interface OpenAIMessageItem {
  type: 'message' | string;
  role?: string;
  content?: OpenAIOutputText[];
}

interface OpenAIUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface OpenAIResponse {
  model?: string;
  output?: OpenAIMessageItem[];
  usage?: OpenAIUsage;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private baseUrl: string;
  private model: string;
  private apiKey: string;

  constructor(config: LLMConfig) {
    if (config.provider !== 'openai') {
      throw new Error('Invalid provider for OpenAIProvider');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-5';
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
  }

  async complete(request: CompletionRequest): Promise<string> {
    const response = await this.completeWithMetadata(request);
    return response.text;
  }

  async completeWithMetadata(
    request: CompletionRequest
  ): Promise<CompletionResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      input: request.userMessage,
    };

    if (request.systemPrompt) {
      body.instructions = request.systemPrompt;
    }

    if (request.maxTokens !== undefined) {
      body.max_output_tokens = request.maxTokens;
    }

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    const response = await fetch(`${this.baseUrl}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const text = extractOutputText(data.output);
    const promptTokens = data.usage?.input_tokens ?? 0;
    const completionTokens = data.usage?.output_tokens ?? 0;

    return {
      text,
      promptTokens,
      completionTokens,
      model: data.model || this.model,
    };
  }

  estimateCost(_promptTokens: number, _completionTokens: number): number {
    // Pricing varies by model and tier; keep 0 until we wire a pricing table.
    return 0;
  }
}

function extractOutputText(output?: OpenAIMessageItem[]): string {
  if (!output) return '';
  let text = '';
  for (const item of output) {
    if (!item?.content) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && content.text) {
        text += content.text;
      }
    }
  }
  return text;
}
