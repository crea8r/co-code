import { describe, expect, it, vi } from 'vitest';
import type { DestinationEvent } from '@co-code/shared';
import { TelegramAdapter, TelegramApiError } from '../telegram/adapter.js';

const channel = {
  id: '123',
  type: 'dm' as const,
};

describe('TelegramAdapter', () => {
  it('emits destination_message and destination_mention when @username is present', () => {
    const adapter = new TelegramAdapter({
      botToken: 'test-token',
      destinationId: 'bot-1',
      agentUsername: 'agentbot',
      sleep: async () => undefined,
    });

    const events: DestinationEvent[] = [];
    adapter.onEvent((event) => events.push(event));

    adapter.ingest({
      update_id: 1,
      message: {
        message_id: 10,
        from: { id: 2, username: 'user' },
        chat: { id: 123, type: 'private' },
        text: 'hi @agentbot',
        date: 1700000000,
        entities: [{ type: 'mention', offset: 3, length: 9 }],
      },
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('destination_message');
    expect(events[1].type).toBe('destination_mention');
  });

  it('maps private chat to dm channel type', () => {
    const adapter = new TelegramAdapter({
      botToken: 'test-token',
      destinationId: 'bot-1',
      sleep: async () => undefined,
    });

    const events: DestinationEvent[] = [];
    adapter.onEvent((event) => events.push(event));

    adapter.ingest({
      update_id: 2,
      message: {
        message_id: 11,
        from: { id: 2, username: 'user' },
        chat: { id: 123, type: 'private' },
        text: 'hi',
        date: 1700000000,
      },
    });

    const messageEvent = events.find((event) => event.type === 'destination_message');
    if (!messageEvent || messageEvent.type !== 'destination_message') {
      throw new Error('Missing destination_message event');
    }
    expect(messageEvent.channel.type).toBe('dm');
  });

  it('retries on rate limit errors when sending messages', async () => {
    let attempts = 0;
    const api = {
      sendMessage: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new TelegramApiError('Too many requests', {
            status: 429,
            code: 429,
            retryAfterSec: 1,
          });
        }
      }),
      sendTyping: vi.fn(async () => undefined),
    };
    const sleep = vi.fn(async () => undefined);

    const adapter = new TelegramAdapter(
      {
        botToken: 'test-token',
        destinationId: 'bot-1',
        sleep,
      },
      api
    );

    await adapter.sendMessage(channel, 'hello');

    expect(api.sendMessage).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
