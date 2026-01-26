import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from '../llm/openai.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    // @ts-expect-error - allow removing fetch in test env
    delete globalThis.fetch;
  }
  vi.restoreAllMocks();
});

describe('OpenAIProvider', () => {
  it('returns text and token metadata from responses API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-5',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'hello runtime' }],
          },
        ],
        usage: { input_tokens: 12, output_tokens: 4 },
      }),
    });

    // @ts-expect-error - test stub
    globalThis.fetch = mockFetch;

    const provider = new OpenAIProvider({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-5',
    });

    const response = await provider.completeWithMetadata({
      systemPrompt: 'system',
      userMessage: 'hi',
      maxTokens: 10,
      temperature: 0.1,
    });

    expect(response.text).toBe('hello runtime');
    expect(response.promptTokens).toBe(12);
    expect(response.completionTokens).toBe(4);
    expect(response.model).toBe('gpt-5');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws on non-OK responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    });

    // @ts-expect-error - test stub
    globalThis.fetch = mockFetch;

    const provider = new OpenAIProvider({
      provider: 'openai',
      apiKey: 'bad-key',
      model: 'gpt-5',
    });

    await expect(
      provider.completeWithMetadata({
        systemPrompt: 'system',
        userMessage: 'hi',
      })
    ).rejects.toThrow('OpenAI API error: 401');
  });
});
