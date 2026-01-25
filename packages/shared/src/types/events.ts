/**
 * WebSocket Event Types
 *
 * Events flow between agent runtime, server, and web frontend.
 */

import type { Message, Channel } from './message.js';
import type { PresenceStatus, EntityType } from './identity.js';

/** Base event structure */
export interface BaseEvent {
  /** Event type */
  type: string;
  /** Event timestamp */
  timestamp: number;
}

// ============================================
// Client → Server Events
// ============================================

export interface AuthenticateEvent extends BaseEvent {
  type: 'authenticate';
  /** JWT token */
  token: string;
}

export interface JoinChannelEvent extends BaseEvent {
  type: 'join_channel';
  channelId: string;
}

export interface LeaveChannelEvent extends BaseEvent {
  type: 'leave_channel';
  channelId: string;
}

export interface SendMessageEvent extends BaseEvent {
  type: 'send_message';
  channelId: string;
  content: Message['content'];
}

export interface TypingEvent extends BaseEvent {
  type: 'typing';
  channelId: string;
}

export interface SetStatusEvent extends BaseEvent {
  type: 'set_status';
  status: PresenceStatus;
}

/** Union of all client → server events */
export type ClientEvent =
  | AuthenticateEvent
  | JoinChannelEvent
  | LeaveChannelEvent
  | SendMessageEvent
  | TypingEvent
  | SetStatusEvent;

// ============================================
// Server → Client Events
// ============================================

export interface AuthenticatedEvent extends BaseEvent {
  type: 'authenticated';
  success: boolean;
  entityId?: string;
  entityType?: EntityType;
  error?: string;
}

export interface NewMessageEvent extends BaseEvent {
  type: 'new_message';
  message: Message;
}

export interface PresenceChangeEvent extends BaseEvent {
  type: 'presence_change';
  entityId: string;
  entityType: EntityType;
  status: PresenceStatus;
}

export interface MemberTypingEvent extends BaseEvent {
  type: 'member_typing';
  channelId: string;
  entityId: string;
  entityType: EntityType;
}

export interface ChannelJoinedEvent extends BaseEvent {
  type: 'channel_joined';
  channel: Channel;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  code: string;
  message: string;
}

/** Union of all server → client events */
export type ServerEvent =
  | AuthenticatedEvent
  | NewMessageEvent
  | PresenceChangeEvent
  | MemberTypingEvent
  | ChannelJoinedEvent
  | ErrorEvent;

/** All events */
export type WSEvent = ClientEvent | ServerEvent;

/** Type guard for client events */
export function isClientEvent(event: WSEvent): event is ClientEvent {
  return [
    'authenticate',
    'join_channel',
    'leave_channel',
    'send_message',
    'typing',
    'set_status',
  ].includes(event.type);
}

/** Type guard for server events */
export function isServerEvent(event: WSEvent): event is ServerEvent {
  return [
    'authenticated',
    'new_message',
    'presence_change',
    'member_typing',
    'channel_joined',
    'error',
  ].includes(event.type);
}
