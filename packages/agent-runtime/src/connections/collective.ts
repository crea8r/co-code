/**
 * Collective Connection
 *
 * WebSocket connection to the collective server.
 * Handles authentication, messaging, and presence.
 */

import WebSocket from 'isomorphic-ws';
import type {
  ClientEvent,
  ServerEvent,
  Message,
  PresenceStatus,
  AttentionState,
} from '@co-code/shared';

export interface CollectiveConnectionConfig {
  /** Server URL */
  url: string;
  /** JWT token for authentication */
  token: string;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay (ms) */
  reconnectDelayMs?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
}

export interface CollectiveConnectionEvents {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (message: Message) => void;
  onMention?: (event: {
    message: Message;
    channelId: string;
    mentionedEntityId: string;
    mentionedEntityType: EntityType;
  }) => void;
  onPresenceChange?: (
    entityId: string,
    status: PresenceStatus
  ) => void;
  onError?: (error: Error) => void;
}

export class CollectiveConnection {
  private ws: WebSocket | null = null;
  private config: Required<CollectiveConnectionConfig>;
  private events: CollectiveConnectionEvents;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isClosing = false;

  constructor(
    config: CollectiveConnectionConfig,
    events: CollectiveConnectionEvents = {}
  ) {
    this.config = {
      autoReconnect: true,
      reconnectDelayMs: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.events = events;
  }

  /**
   * Connect to the collective server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          // Authenticate
          this.send({
            type: 'authenticate',
            token: this.config.token,
            timestamp: Date.now(),
          });
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString()) as ServerEvent;
            this.handleServerEvent(data, resolve, reject);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          const err = new Error(`WebSocket error: ${error.message}`);
          this.events.onError?.(err);
          reject(err);
        };

        this.ws.onclose = () => {
          if (!this.isClosing) {
            this.events.onDisconnected?.();
            this.maybeReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle server events
   */
  private handleServerEvent(
    event: ServerEvent,
    resolve?: (value: void) => void,
    reject?: (reason: Error) => void
  ): void {
    switch (event.type) {
      case 'authenticated':
        if (event.success) {
          this.events.onConnected?.();
          resolve?.();
        } else {
          const error = new Error(event.error || 'Authentication failed');
          this.events.onError?.(error);
          reject?.(error);
        }
        break;

      case 'new_message':
        this.events.onMessage?.(event.message);
        break;

      case 'mention':
        this.events.onMention?.({
          message: event.message,
          channelId: event.message.channelId,
          mentionedEntityId: event.mentionedEntityId,
          mentionedEntityType: event.mentionedEntityType,
        });
        break;

      case 'presence_change':
        this.events.onPresenceChange?.(event.entityId, event.status);
        break;

      case 'error':
        this.events.onError?.(new Error(event.message));
        break;
    }
  }

  /**
   * Send a client event
   */
  send(event: ClientEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }
    this.ws.send(JSON.stringify(event));
  }

  /**
   * Join a channel
   */
  joinChannel(channelId: string): void {
    this.send({
      type: 'join_channel',
      channelId,
      timestamp: Date.now(),
    });
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelId: string): void {
    this.send({
      type: 'leave_channel',
      channelId,
      timestamp: Date.now(),
    });
  }

  /**
   * Send a message
   */
  sendMessage(channelId: string, content: Message['content']): void {
    this.send({
      type: 'send_message',
      channelId,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Set presence status
   */
  setStatus(status: PresenceStatus): void {
    this.send({
      type: 'set_status',
      status,
      timestamp: Date.now(),
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(channelId: string): void {
    this.send({
      type: 'typing',
      channelId,
      timestamp: Date.now(),
    });
  }

  /**
   * Set attention state
   */
  setAttention(
    channelId: string,
    state: AttentionState,
    queueSize: number
  ): void {
    this.send({
      type: 'set_attention',
      channelId,
      state,
      queueSize,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Maybe reconnect after disconnect
   */
  private maybeReconnect(): void {
    if (!this.config.autoReconnect) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.events.onError?.(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay =
      this.config.reconnectDelayMs * Math.pow(1.5, this.reconnectAttempts - 1);

    this.reconnectTimeout = setTimeout(() => {
      console.log(
        `Reconnecting... attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
      );
      this.connect().catch((error) => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.isClosing = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.events.onDisconnected?.();
  }
}
