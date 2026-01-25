/**
 * LLM Provider Interface
 *
 * PORTABILITY: This interface abstracts LLM calls.
 * Core code uses this interface, implementations handle specific providers.
 */

export interface CompletionRequest {
  /** System prompt */
  systemPrompt: string;
  /** User message */
  userMessage: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
  /** Stop sequences */
  stopSequences?: string[];
}

export interface CompletionResponse {
  /** Generated text */
  text: string;
  /** Tokens used in prompt */
  promptTokens: number;
  /** Tokens generated */
  completionTokens: number;
  /** Model used */
  model: string;
}

export interface LLMProvider {
  /** Provider name */
  readonly name: string;

  /**
   * Generate a completion
   */
  complete(request: CompletionRequest): Promise<string>;

  /**
   * Generate a completion with full response metadata
   */
  completeWithMetadata(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Estimate cost in credits for a request
   */
  estimateCost(promptTokens: number, completionTokens: number): number;
}

export interface LLMConfig {
  /** Provider type */
  provider: 'anthropic' | 'openai';
  /** API key */
  apiKey: string;
  /** Model to use */
  model: string;
  /** Base URL (optional, for proxies) */
  baseUrl?: string;
}
