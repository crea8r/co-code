import { describe, expect, it, vi } from 'vitest';
import type { DestinationEvent } from '@co-code/shared';
import { SlackAdapter, SlackApiError } from '../slack/adapter.js';

const channel = {
  id: 'C123',
  type: 'channel' as const,
  name: 'general',
};

describe('SlackAdapter', () => {
  it('emits destination_message and destination_mention events', () => {
    const adapter = new SlackAdapter({
      botToken: 'test-token',
      destinationId: 'workspace-1',
      agentUserId: 'U_AGENT',
      sleep: async () => undefined,
    });

    const events: DestinationEvent[] = [];
    adapter.onEvent((event) => events.push(event));

    adapter.ingest({
      event: {
        type: 'message',
        user: 'U_USER',
        text: 'hello <@U_AGENT>',
        ts: '1700000000.1234',
        channel: 'C123',
        channel_type: 'channel',
      },
      team_id: 'T1',
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('destination_message');
    expect(events[1].type).toBe('destination_mention');
  });

  it('maps IM channel type to dm', () => {
    const adapter = new SlackAdapter({
      botToken: 'test-token',
      destinationId: 'workspace-1',
      agentUserId: 'U_AGENT',
      sleep: async () => undefined,
    });

    const events: DestinationEvent[] = [];
    adapter.onEvent((event) => events.push(event));

    adapter.ingest({
      event: {
        type: 'message',
        user: 'U_USER',
        text: 'hello',
        ts: '1700000000.1234',
        channel: 'D123',
        channel_type: 'im',
      },
    });

    const messageEvent = events.find((event) => event.type === 'destination_message');
    if (!messageEvent || messageEvent.type !== 'destination_message') {
      throw new Error('Missing destination_message event');
    }
    expect(messageEvent.channel.type).toBe('dm');
  });

  it('retries on rate limits when sending messages', async () => {
    let attempts = 0;
    const api = {
      postMessage: vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new SlackApiError('Rate limited', {
            status: 429,
            code: 'rate_limited',
            retryAfterSec: 1,
          });
        }
      }),
      postTyping: vi.fn(async () => undefined),
      setPresence: vi.fn(async () => undefined),
    };
    const sleep = vi.fn(async () => undefined);

    const adapter = new SlackAdapter(
      {
        botToken: 'test-token',
        destinationId: 'workspace-1',
        agentUserId: 'U_AGENT',
        sleep,
      },
      api
    );

    await adapter.sendMessage(channel, 'hello');

    expect(api.postMessage).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});
