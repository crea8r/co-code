/**
 * Slack Destination Adapter
 *
 * Socket Mode or Events API should feed Slack events into ingest().
 */

import type {
  DestinationChannel,
  DestinationChannelType,
  DestinationEvent,
  DestinationIdentity,
  DestinationMentionEvent,
  DestinationMessage,
  DestinationMessageEvent,
  DestinationTypingEvent,
  DestinationPresenceEvent,
  DestinationAttentionEvent,
  MentionPriority,
} from '@co-code/shared';
import type { DestinationAdapter, PresenceState } from '../destination/interface.js';

export interface SlackAdapterConfig {
  botToken: string;
  appToken?: string;
  destinationId: string;
  agentUserId?: string;
  apiBaseUrl?: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

interface SlackMessageEventPayload {
  type: 'message' | 'app_mention';
  user?: string;
  text?: string;
  ts: string;
  channel: string;
  channel_type?: 'im' | 'channel' | 'group' | 'mpim';
  thread_ts?: string;
}

interface SlackEventEnvelope {
  type?: string;
  event?: SlackMessageEventPayload;
  team_id?: string;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

interface SlackApiClient {
  postMessage(
    channel: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  postTyping(channel: string): Promise<void>;
  setPresence(status: PresenceState): Promise<void>;
}

export class SlackApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly retryAfterSec?: number;

  constructor(message: string, options?: { status?: number; code?: string; retryAfterSec?: number }) {
    super(message);
    this.status = options?.status;
    this.code = options?.code;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

class FetchSlackApiClient implements SlackApiClient {
  private baseUrl: string;

  constructor(private token: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://slack.com/api';
  }

  async postMessage(
    channel: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.request('/chat.postMessage', {
      channel,
      text,
      metadata,
    });
  }

  async postTyping(channel: string): Promise<void> {
    await this.request('/chat.typing', { channel });
  }

  async setPresence(status: PresenceState): Promise<void> {
    await this.request('/users.setPresence', { presence: status });
  }

  private async request(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After') || '1');
      throw new SlackApiError('Rate limited', {
        status: 429,
        code: 'rate_limited',
        retryAfterSec: retryAfter,
      });
    }

    const data = (await response.json()) as SlackApiResponse;
    if (!response.ok || !data.ok) {
      throw new SlackApiError('Slack API error', {
        status: response.status,
        code: data.error,
      });
    }
  }
}

export class SlackAdapter implements DestinationAdapter {
  readonly destination = 'slack' as const;
  readonly destinationId: string;
  private connected = false;
  private handlers = new Set<(event: DestinationEvent) => void>();
  private api: SlackApiClient;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private sleep: (ms: number) => Promise<void>;
  private agentUserId?: string;

  constructor(private config: SlackAdapterConfig, api?: SlackApiClient) {
    this.destinationId = config.destinationId;
    this.agentUserId = config.agentUserId;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 1000;
    this.sleep = config.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.api = api ?? new FetchSlackApiClient(config.botToken, config.apiBaseUrl);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onEvent(handler: (event: DestinationEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  ingest(payload: SlackEventEnvelope): void {
    const event = payload.event;
    if (!event) return;

    const channelType = toDestinationChannelType(event.channel_type);
    const channel: DestinationChannel = {
      id: event.channel,
      type: channelType,
      parentId: event.thread_ts ? event.channel : undefined,
    };

    const message: DestinationMessage = {
      id: event.ts,
      channelId: event.channel,
      sender: {
        id: event.user || 'unknown',
        entityType: 'user',
      },
      text: event.text,
      createdAt: slackTsToMs(event.ts),
    };

    const destinationMessageEvent: DestinationMessageEvent = {
      type: 'destination_message',
      destination: 'slack',
      destinationId: this.destinationId,
      timestamp: Date.now(),
      channel,
      message,
    };

    this.emit(destinationMessageEvent);

    const mentionEvent = this.buildMentionEvent(event, channel, message);
    if (mentionEvent) {
      this.emit(mentionEvent);
    }
  }

  async sendMessage(
    channel: DestinationChannel,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.withRetry(() => this.api.postMessage(channel.id, text, metadata));
  }

  async sendTyping(channel: DestinationChannel): Promise<void> {
    await this.withRetry(() => this.api.postTyping(channel.id));
  }

  async setPresence(status: PresenceState): Promise<void> {
    await this.withRetry(() => this.api.setPresence(status));
  }

  mapUserId(externalId: string): string {
    return externalId;
  }

  mapChannelId(externalId: string): string {
    return externalId;
  }

  private emit(event: DestinationEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  private buildMentionEvent(
    payload: SlackMessageEventPayload,
    channel: DestinationChannel,
    message: DestinationMessage
  ): DestinationMentionEvent | null {
    const text = payload.text || '';
    const priority: MentionPriority = payload.type === 'app_mention' ? 'high' : 'normal';

    if (payload.type === 'app_mention') {
      return {
        type: 'destination_mention',
        destination: 'slack',
        destinationId: this.destinationId,
        timestamp: Date.now(),
        channel,
        message,
        mentioned: {
          id: this.agentUserId || 'unknown',
          entityType: 'agent',
        },
        priority,
      };
    }

    if (this.agentUserId && text.includes(`<@${this.agentUserId}>`)) {
      return {
        type: 'destination_mention',
        destination: 'slack',
        destinationId: this.destinationId,
        timestamp: Date.now(),
        channel,
        message,
        mentioned: {
          id: this.agentUserId,
          entityType: 'agent',
        },
        priority,
      };
    }

    return null;
  }

  private async withRetry(task: () => Promise<void>): Promise<void> {
    let attempt = 0;
    while (true) {
      try {
        await task();
        return;
      } catch (error) {
        attempt += 1;
        const retryAfter =
          error instanceof SlackApiError && error.retryAfterSec !== undefined
            ? error.retryAfterSec * 1000
            : null;
        if (attempt > this.maxRetries) {
          throw error;
        }
        const delay = retryAfter ?? this.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }
}

function toDestinationChannelType(
  channelType?: SlackMessageEventPayload['channel_type']
): DestinationChannelType {
  switch (channelType) {
    case 'im':
      return 'dm';
    case 'group':
    case 'mpim':
      return 'group';
    case 'channel':
    default:
      return 'channel';
  }
}

function slackTsToMs(ts: string): number {
  const value = Number(ts);
  if (Number.isNaN(value)) return Date.now();
  return Math.floor(value * 1000);
}

export type { SlackMessageEventPayload, SlackEventEnvelope, SlackApiClient };
