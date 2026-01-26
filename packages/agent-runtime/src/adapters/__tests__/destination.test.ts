import { describe, expect, it, vi } from 'vitest';
import type { DestinationEvent } from '@co-code/shared';
import { MockDestinationAdapter } from '../destination/mock.js';

const channel = {
  id: 'channel-1',
  type: 'channel' as const,
  name: 'general',
};

describe('MockDestinationAdapter', () => {
  it('connects, disconnects, and tracks state', async () => {
    const adapter = new MockDestinationAdapter('slack', 'workspace-1');

    expect(adapter.isConnected()).toBe(false);
    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);
    await adapter.disconnect();
    expect(adapter.isConnected()).toBe(false);
  });

  it('emits events to subscribers', () => {
    const adapter = new MockDestinationAdapter('telegram', 'chat-1');
    const handler = vi.fn();
    const unsubscribe = adapter.onEvent(handler);

    const event: DestinationEvent = {
      type: 'destination_message',
      destination: 'telegram',
      destinationId: 'chat-1',
      timestamp: Date.now(),
      channel,
      message: {
        id: 'msg-1',
        channelId: channel.id,
        sender: { id: 'user-1', entityType: 'user' },
        text: 'hello',
        createdAt: Date.now(),
      },
    };

    adapter.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);

    unsubscribe();
    adapter.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('records outgoing messages, typing, and presence', async () => {
    const adapter = new MockDestinationAdapter('slack', 'workspace-1');

    await adapter.sendMessage(channel, 'hello', { urgency: 'low' });
    await adapter.sendTyping(channel);
    await adapter.setPresence('away');

    expect(adapter.sent).toEqual([
      {
        type: 'message',
        channel,
        text: 'hello',
        metadata: { urgency: 'low' },
      },
      { type: 'typing', channel },
      { type: 'presence', status: 'away' },
    ]);
  });
});
