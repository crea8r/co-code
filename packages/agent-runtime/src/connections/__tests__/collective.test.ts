import { describe, expect, it, vi } from 'vitest';
import WebSocket from 'isomorphic-ws';
import { CollectiveConnection } from '../collective.js';
import type { Message } from '@co-code/shared';

const baseMessage: Message = {
  id: 'msg-1',
  channelId: 'channel-1',
  senderId: 'user-1',
  senderType: 'user',
  content: { text: 'hello @agent-1' },
  createdAt: Date.now(),
  editedAt: null,
};

describe('CollectiveConnection', () => {
  it('emits mention events to onMention', () => {
    const onMention = vi.fn();
    const connection = new CollectiveConnection(
      { url: 'ws://example.com', token: 'test-token' },
      { onMention }
    );

    // @ts-expect-error - accessing private method for test
    connection.handleServerEvent({
      type: 'mention',
      message: baseMessage,
      mentionedEntityId: 'agent-1',
      mentionedEntityType: 'agent',
      timestamp: Date.now(),
    });

    expect(onMention).toHaveBeenCalledTimes(1);
    expect(onMention).toHaveBeenCalledWith({
      message: baseMessage,
      channelId: baseMessage.channelId,
      mentionedEntityId: 'agent-1',
      mentionedEntityType: 'agent',
    });
  });

  it('sends attention updates over the socket', () => {
    const connection = new CollectiveConnection({
      url: 'ws://example.com',
      token: 'test-token',
    });

    const send = vi.fn();
    // @ts-expect-error - inject websocket for test
    connection.ws = { readyState: WebSocket.OPEN, send };

    connection.setAttention('channel-1', 'active', 2);

    expect(send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(send.mock.calls[0][0]);
    expect(payload).toMatchObject({
      type: 'set_attention',
      channelId: 'channel-1',
      state: 'active',
      queueSize: 2,
    });
  });
});
