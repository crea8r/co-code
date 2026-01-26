/**
 * Telegram Destination Adapter
 *
 * Bot webhook or long-polling should feed updates into ingest().
 */

import type {
  DestinationChannel,
  DestinationChannelType,
  DestinationEvent,
  DestinationMessage,
  DestinationMentionEvent,
  DestinationMessageEvent,
  MentionPriority,
} from '@co-code/shared';
import type { DestinationAdapter, PresenceState } from '../destination/interface.js';

export interface TelegramAdapterConfig {
  botToken: string;
  destinationId: string;
  agentUserId?: string;
  agentUsername?: string;
  apiBaseUrl?: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

interface TelegramEntity {
  type: 'mention' | 'text_mention' | string;
  offset: number;
  length: number;
  user?: TelegramUser;
}

interface TelegramMessagePayload {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  date: number;
  entities?: TelegramEntity[];
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessagePayload;
}

interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

interface TelegramApiClient {
  sendMessage(chatId: number, text: string): Promise<void>;
  sendTyping(chatId: number): Promise<void>;
}

export class TelegramApiError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly retryAfterSec?: number;

  constructor(message: string, options?: { status?: number; code?: number; retryAfterSec?: number }) {
    super(message);
    this.status = options?.status;
    this.code = options?.code;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

class FetchTelegramApiClient implements TelegramApiClient {
  private baseUrl: string;

  constructor(private token: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'https://api.telegram.org';
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.request('/sendMessage', { chat_id: chatId, text });
  }

  async sendTyping(chatId: number): Promise<void> {
    await this.request('/sendChatAction', { chat_id: chatId, action: 'typing' });
  }

  private async request(path: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bot${this.token}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TelegramApiResponse;

    if (!response.ok || !data.ok) {
      const retryAfter = data.parameters?.retry_after;
      throw new TelegramApiError(data.description || 'Telegram API error', {
        status: response.status,
        code: data.error_code,
        retryAfterSec: retryAfter,
      });
    }
  }
}

export class TelegramAdapter implements DestinationAdapter {
  readonly destination = 'telegram' as const;
  readonly destinationId: string;
  private connected = false;
  private handlers = new Set<(event: DestinationEvent) => void>();
  private api: TelegramApiClient;
  private maxRetries: number;
  private retryBaseDelayMs: number;
  private sleep: (ms: number) => Promise<void>;
  private agentUserId?: string;
  private agentUsername?: string;

  constructor(private config: TelegramAdapterConfig, api?: TelegramApiClient) {
    this.destinationId = config.destinationId;
    this.agentUserId = config.agentUserId;
    this.agentUsername = config.agentUsername;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBaseDelayMs = config.retryBaseDelayMs ?? 1000;
    this.sleep = config.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.api = api ?? new FetchTelegramApiClient(config.botToken, config.apiBaseUrl);
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

  ingest(update: TelegramUpdate): void {
    const messagePayload = update.message;
    if (!messagePayload) return;

    const channel: DestinationChannel = {
      id: String(messagePayload.chat.id),
      type: toDestinationChannelType(messagePayload.chat.type),
      name: messagePayload.chat.title || messagePayload.chat.username,
    };

    const message: DestinationMessage = {
      id: String(messagePayload.message_id),
      channelId: String(messagePayload.chat.id),
      sender: {
        id: String(messagePayload.from?.id ?? 'unknown'),
        entityType: 'user',
        displayName: formatDisplayName(messagePayload.from),
      },
      text: messagePayload.text,
      createdAt: messagePayload.date * 1000,
    };

    const destinationMessageEvent: DestinationMessageEvent = {
      type: 'destination_message',
      destination: 'telegram',
      destinationId: this.destinationId,
      timestamp: Date.now(),
      channel,
      message,
    };

    this.emit(destinationMessageEvent);

    const mentionEvent = this.buildMentionEvent(messagePayload, channel, message);
    if (mentionEvent) {
      this.emit(mentionEvent);
    }
  }

  async sendMessage(channel: DestinationChannel, text: string): Promise<void> {
    await this.withRetry(() => this.api.sendMessage(Number(channel.id), text));
  }

  async sendTyping(channel: DestinationChannel): Promise<void> {
    await this.withRetry(() => this.api.sendTyping(Number(channel.id)));
  }

  async setPresence(_status: PresenceState): Promise<void> {
    // Telegram bot API does not support presence updates.
    return Promise.resolve();
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
    payload: TelegramMessagePayload,
    channel: DestinationChannel,
    message: DestinationMessage
  ): DestinationMentionEvent | null {
    const text = payload.text || '';
    const entities = payload.entities || [];
    let mentioned = false;

    for (const entity of entities) {
      if (entity.type === 'text_mention' && this.agentUserId) {
        if (String(entity.user?.id) === this.agentUserId) {
          mentioned = true;
          break;
        }
      }

      if (entity.type === 'mention' && this.agentUsername) {
        const fragment = text.slice(entity.offset, entity.offset + entity.length);
        if (fragment.toLowerCase() === `@${this.agentUsername}`.toLowerCase()) {
          mentioned = true;
          break;
        }
      }
    }

    if (!mentioned) return null;

    const priority: MentionPriority = 'normal';

    return {
      type: 'destination_mention',
      destination: 'telegram',
      destinationId: this.destinationId,
      timestamp: Date.now(),
      channel,
      message,
      mentioned: {
        id: this.agentUserId || this.agentUsername || 'unknown',
        entityType: 'agent',
      },
      priority,
    };
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
          error instanceof TelegramApiError && error.retryAfterSec !== undefined
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

function toDestinationChannelType(type: TelegramChat['type']): DestinationChannelType {
  switch (type) {
    case 'private':
      return 'dm';
    case 'group':
    case 'supergroup':
      return 'group';
    case 'channel':
    default:
      return 'channel';
  }
}

function formatDisplayName(user?: TelegramUser): string | undefined {
  if (!user) return undefined;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name || user.username;
}

export type { TelegramApiClient };
