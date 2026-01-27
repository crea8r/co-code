/**
 * LLM Provider Interface
 *
 * PORTABILITY: This interface abstracts LLM calls.
 * Core code uses this interface, implementations handle specific providers.
 */

export type ModelTier = 'cheap' | 'standard' | 'expensive' | 'free';

export interface Model {
  id: string;                    // e.g. "claude-3-5-sonnet-20241022"
  name: string;                  // Display name
  provider: string;              // "anthropic", "openai", etc.
  tier: ModelTier;
  inputCostPer1k: number;        // USD per 1K input tokens
  outputCostPer1k: number;       // USD per 1K output tokens
  maxContext: number;            // Max tokens
  strengths: string[];           // ["reasoning", "coding", "speed"]
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ToolResult[];
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface CompletionRequest {
  model: string;
  systemPrompt: string;
  messages: Message[];
  tools?: Tool[];
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  text: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  cost: number;                  // Actual cost in USD
}

export interface CostEstimate {
  inputTokens: number;           // Estimated
  outputTokens: number;          // Estimated
  estimatedCost: number;         // USD
  confidence: 'low' | 'medium' | 'high';
}

export interface LLMProvider {
  id: string;
  listModels(): Model[];
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  estimateCost(request: CompletionRequest): CostEstimate;
}

export interface LLMConfig {
  /** Provider type */
  provider: 'anthropic' | 'openai' | 'qwen' | 'local';
  /** API key */
  apiKey: string;
  /** Model to use */
  model: string;
  /** Base URL (optional, for proxies) */
  baseUrl?: string;
  /** Anthropic config */
  anthropic?: { apiKey: string; models: string[] };
  /** OpenAI config */
  openai?: { apiKey: string; models: string[] };
  /** Qwen config */
  qwen?: { apiKey: string; models: string[] };
  /** Local config */
  local?: { endpoint: string; models: string[] };
}
