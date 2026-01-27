/**
 * OpenAI Provider Tests
 * 
 * Updated to use the new LLMProvider interface and mock the OpenAI SDK.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../llm/openai.js';

// Mock OpenAI SDK
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'hello runtime',
                  role: 'assistant',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 4,
            },
            model: 'gpt-4o',
          }),
        },
      },
    })),
  };
});

describe('OpenAIProvider', () => {
  it('returns text and usage from chat completions API', async () => {
    const provider = new OpenAIProvider('test-key');

    const response = await provider.complete({
      model: 'gpt-4o',
      systemPrompt: 'system',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 10,
      temperature: 0.1,
    });

    expect(response.text).toBe('hello runtime');
    expect(response.usage.inputTokens).toBe(12);
    expect(response.usage.outputTokens).toBe(4);
    expect(response.model).toBe('gpt-4o');
    expect(response.cost).toBeGreaterThan(0);
  });

  it('calculates cost correctly for gpt-4o', async () => {
    const provider = new OpenAIProvider('test-key');

    const response = await provider.complete({
      model: 'gpt-4o',
      systemPrompt: 'system',
      messages: [{ role: 'user', content: 'hi' }],
    });

    // 12 input * 0.0025/1k + 4 output * 0.01/1k
    // 0.00003 + 0.00004 = 0.00007
    expect(response.cost).toBeCloseTo(0.00007, 6);
  });

  it('estimates cost roughly', () => {
    const provider = new OpenAIProvider('test-key');
    const estimate = provider.estimateCost({
      model: 'gpt-4o',
      systemPrompt: 'Hello',
      messages: [{ role: 'user', content: 'Hi' }],
      maxTokens: 100,
    });

    expect(estimate.estimatedCost).toBeGreaterThan(0);
    expect(estimate.confidence).toBe('low');
  });
});
