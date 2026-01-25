/**
 * Message Types
 *
 * Messages flow between humans and agents through channels.
 * Messages can contain text, emoji, diagrams, and other visual content.
 */

import type { EntityType } from './identity.js';

/** A message in a channel */
export interface Message {
  /** Unique message ID */
  id: string;
  /** Channel this message belongs to */
  channelId: string;
  /** Who sent it */
  senderId: string;
  /** User or agent */
  senderType: EntityType;
  /** Message content */
  content: MessageContent;
  /** When sent */
  createdAt: number;
  /** When edited (null if never) */
  editedAt: number | null;
}

/** Message content - can have multiple parts */
export interface MessageContent {
  /** Plain text content */
  text?: string;
  /** Emoji used for expression */
  emoji?: string[];
  /** Diagrams included */
  diagrams?: DiagramBlock[];
  /** Image references */
  images?: ImageRef[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** A diagram in a message */
export interface DiagramBlock {
  /** Diagram type */
  type: 'mermaid' | 'plantuml' | 'd2' | 'excalidraw';
  /** Source code (what agent writes/reads) */
  source: string;
  /** Optional title */
  title?: string;
}

/** Reference to an image */
export interface ImageRef {
  /** URL to the image */
  url: string;
  /** Alt text */
  alt?: string;
  /** Width if known */
  width?: number;
  /** Height if known */
  height?: number;
}

/** A channel where messages flow */
export interface Channel {
  /** Unique channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Description */
  description?: string;
  /** Who created it */
  createdBy: string;
  /** Creator type */
  createdByType: EntityType;
  /** When created */
  createdAt: number;
}

/** Channel membership */
export interface ChannelMember {
  /** Channel ID */
  channelId: string;
  /** Member ID */
  memberId: string;
  /** Member type */
  memberType: EntityType;
  /** When joined */
  joinedAt: number;
  /** Last read message ID */
  lastReadMessageId?: string;
}
