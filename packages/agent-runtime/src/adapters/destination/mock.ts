/**
 * Mock Destination Adapter
 *
 * Used for tests and local dev.
 */

import type {
  DestinationChannel,
  DestinationEvent,
  DestinationKind,
} from '@co-code/shared';
import type { DestinationAdapter, PresenceState } from './interface.js';

export interface MockSendRecord {
  type: 'message' | 'typing' | 'presence';
  channel?: DestinationChannel;
  text?: string;
  metadata?: Record<string, unknown>;
  status?: PresenceState;
}

export class MockDestinationAdapter implements DestinationAdapter {
  readonly destination: DestinationKind;
  readonly destinationId: string;
  private connected = false;
  private handlers = new Set<(event: DestinationEvent) => void>();
  readonly sent: MockSendRecord[] = [];

  constructor(destination: DestinationKind, destinationId: string) {
    this.destination = destination;
    this.destinationId = destinationId;
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

  emit(event: DestinationEvent): void {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  async sendMessage(
    channel: DestinationChannel,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.sent.push({ type: 'message', channel, text, metadata });
  }

  async sendTyping(channel: DestinationChannel): Promise<void> {
    this.sent.push({ type: 'typing', channel });
  }

  async setPresence(status: PresenceState): Promise<void> {
    this.sent.push({ type: 'presence', status });
  }

  mapUserId(externalId: string): string {
    return externalId;
  }

  mapChannelId(externalId: string): string {
    return externalId;
  }
}
