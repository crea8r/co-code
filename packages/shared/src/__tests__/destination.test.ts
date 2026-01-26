import { describe, expect, it, expectTypeOf } from 'vitest';
import type {
  DestinationEvent,
  DestinationMessageEvent,
  DestinationMentionEvent,
  DestinationAttentionEvent,
  DestinationTypingEvent,
  DestinationPresenceEvent,
} from '../types/destination.js';

const base = {
  destination: 'slack' as const,
  destinationId: 'workspace-1',
  timestamp: Date.now(),
};

const channel = {
  id: 'channel-1',
  type: 'channel' as const,
  name: 'general',
};

const actor = {
  id: 'user-1',
  entityType: 'user' as const,
  displayName: 'User One',
};

const message = {
  id: 'msg-1',
  channelId: channel.id,
  sender: actor,
  text: 'hello @agent-1',
  createdAt: Date.now(),
};

describe('Destination event contract', () => {
  it('accepts a message event', () => {
    const event: DestinationMessageEvent = {
      ...base,
      type: 'destination_message',
      message,
      channel,
    };

    expect(event.type).toBe('destination_message');
    expectTypeOf(event).toMatchTypeOf<DestinationMessageEvent>();
  });

  it('accepts a mention event with target and priority', () => {
    const event: DestinationMentionEvent = {
      ...base,
      type: 'destination_mention',
      message,
      channel,
      mentioned: {
        id: 'agent-1',
        entityType: 'agent',
        displayName: 'Agent One',
      },
      priority: 'high',
    };

    expect(event.priority).toBe('high');
    expect(event.mentioned.id).toBe('agent-1');
    expectTypeOf(event).toMatchTypeOf<DestinationMentionEvent>();
  });

  it('accepts an attention event with queue state', () => {
    const event: DestinationAttentionEvent = {
      ...base,
      type: 'destination_attention',
      channel,
      agentId: 'agent-1',
      state: 'queued',
      queueSize: 2,
    };

    expect(event.state).toBe('queued');
    expect(event.queueSize).toBe(2);
    expectTypeOf(event).toMatchTypeOf<DestinationAttentionEvent>();
  });

  it('accepts typing and presence events', () => {
    const typing: DestinationTypingEvent = {
      ...base,
      type: 'destination_typing',
      channel,
      actor,
    };

    const presence: DestinationPresenceEvent = {
      ...base,
      type: 'destination_presence',
      actor,
      status: 'away',
    };

    const events: DestinationEvent[] = [typing, presence];

    expect(events).toHaveLength(2);
    expectTypeOf(typing).toMatchTypeOf<DestinationTypingEvent>();
    expectTypeOf(presence).toMatchTypeOf<DestinationPresenceEvent>();
  });
});
