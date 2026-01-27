/**
 * Collective Client
 *
 * WebSocket client that connects to the collective server.
 * Manages authentication, channels, messages, and presence.
 */

import WebSocket from 'ws';
import type { Message } from '@co-code/shared';

export interface CollectiveConfig {
  url: string;
  agentId: string;
  token: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'dm' | 'invite-only';
}

export interface Mention {
  messageId: string;
  channelId: string;
  content: string;
  senderId: string;
  timestamp: string;
}

export class CollectiveClient {
  private ws: WebSocket | null = null;
  private config: CollectiveConfig | null = null;
  private connected = false;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  async connect(config: CollectiveConfig): Promise<void> {
    this.config = config;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(config.url);

      this.ws.on('open', () => {
        // Authenticate
        this.send({
          type: 'authenticate',
          agentId: config.agentId,
          token: config.token,
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'authenticated') {
            this.connected = true;
            resolve();
          } else if (message.type === 'error') {
            reject(new Error(message.error));
          }

          // Dispatch to handlers
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.connected = false;
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private send(data: any): void {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to collective server');
    }
    this.ws.send(JSON.stringify(data));
  }

  // Tool methods

  async listChannels(): Promise<Channel[]> {
    return new Promise((resolve, reject) => {
      this.send({ type: 'list_channels' });

      const timeout = setTimeout(() => {
        this.messageHandlers.delete('channels_list');
        reject(new Error('Timeout waiting for channels list'));
      }, 5000);

      this.messageHandlers.set('channels_list', (message) => {
        clearTimeout(timeout);
        this.messageHandlers.delete('channels_list');
        resolve(message.channels || []);
      });
    });
  }

  async joinChannel(channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.send({ type: 'join_channel', channelId });

      const timeout = setTimeout(() => {
        this.messageHandlers.delete('channel_joined');
        reject(new Error('Timeout joining channel'));
      }, 5000);

      this.messageHandlers.set('channel_joined', (message) => {
        clearTimeout(timeout);
        this.messageHandlers.delete('channel_joined');
        if (message.channelId === channelId) {
          resolve();
        }
      });
    });
  }

  async sendMessage(channelId: string, content: string, replyTo?: string): Promise<void> {
    this.send({
      type: 'send_message',
      channelId,
      content,
      replyTo,
    });
  }

  async getMentions(limit?: number): Promise<Mention[]> {
    return new Promise((resolve, reject) => {
      this.send({ type: 'get_mentions', limit: limit || 10 });

      const timeout = setTimeout(() => {
        this.messageHandlers.delete('mentions_list');
        reject(new Error('Timeout getting mentions'));
      }, 5000);

      this.messageHandlers.set('mentions_list', (message) => {
        clearTimeout(timeout);
        this.messageHandlers.delete('mentions_list');
        resolve(message.mentions || []);
      });
    });
  }

  async setPresence(status: 'online' | 'away' | 'busy'): Promise<void> {
    this.send({ type: 'set_presence', status });
  }
}
