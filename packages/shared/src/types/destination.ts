/**
 * Destination Event Contract
 *
 * Shared types for external destinations (Slack, Telegram, etc.).
 */

import type { EntityType } from './identity.js';
import type { AttentionState } from './identity.js';

export type DestinationKind = 'slack' | 'telegram' | 'collective' | 'other';

export type DestinationChannelType = 'channel' | 'dm' | 'group' | 'thread';

export type MentionPriority = 'low' | 'normal' | 'high';

export interface DestinationIdentity {
  /** Destination-specific user or bot id */
  id: string;
  /** Type of entity */
  entityType: EntityType;
  /** Display name in destination */
  displayName?: string;
}

export interface DestinationChannel {
  id: string;
  type: DestinationChannelType;
  name?: string;
  /** Optional parent channel for threads */
  parentId?: string;
}

export interface DestinationMessage {
  id: string;
  channelId: string;
  sender: DestinationIdentity;
  text?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface DestinationBaseEvent {
  /** Destination type (Slack, Telegram, etc.) */
  destination: DestinationKind;
  /** Destination-specific identifier (workspace, chat id, etc.) */
  destinationId: string;
  /** Timestamp in ms */
  timestamp: number;
}

export interface DestinationMessageEvent extends DestinationBaseEvent {
  type: 'destination_message';
  message: DestinationMessage;
  channel: DestinationChannel;
}

export interface DestinationMentionEvent extends DestinationBaseEvent {
  type: 'destination_mention';
  message: DestinationMessage;
  channel: DestinationChannel;
  mentioned: DestinationIdentity;
  priority: MentionPriority;
}

export interface DestinationTypingEvent extends DestinationBaseEvent {
  type: 'destination_typing';
  channel: DestinationChannel;
  actor: DestinationIdentity;
}

export interface DestinationPresenceEvent extends DestinationBaseEvent {
  type: 'destination_presence';
  actor: DestinationIdentity;
  status: 'online' | 'away' | 'offline';
}

export interface DestinationAttentionEvent extends DestinationBaseEvent {
  type: 'destination_attention';
  channel: DestinationChannel;
  agentId: string;
  state: AttentionState;
  queueSize: number;
}

export type DestinationEvent =
  | DestinationMessageEvent
  | DestinationMentionEvent
  | DestinationTypingEvent
  | DestinationPresenceEvent
  | DestinationAttentionEvent;
