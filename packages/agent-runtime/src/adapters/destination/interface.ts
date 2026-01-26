/**
 * Destination Adapter Interface
 *
 * External destinations (Slack, Telegram, etc.) implement this interface.
 */

import type {
  DestinationEvent,
  DestinationChannel,
  DestinationKind,
} from '@co-code/shared';

export type PresenceState = 'online' | 'away' | 'offline';

export interface DestinationAdapter {
  /** Destination type */
  readonly destination: DestinationKind;
  /** Destination instance id (workspace/chat id) */
  readonly destinationId: string;

  /** Connect to destination */
  connect(): Promise<void>;
  /** Disconnect from destination */
  disconnect(): Promise<void>;
  /** Connection status */
  isConnected(): boolean;

  /** Subscribe to destination events */
  onEvent(handler: (event: DestinationEvent) => void): () => void;

  /** Send a message */
  sendMessage(
    channel: DestinationChannel,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /** Send typing indicator */
  sendTyping(channel: DestinationChannel): Promise<void>;

  /** Set presence state */
  setPresence(status: PresenceState): Promise<void>;

  /** Map destination user id into internal id */
  mapUserId(externalId: string): string;
  /** Map destination channel id into internal id */
  mapChannelId(externalId: string): string;
}
