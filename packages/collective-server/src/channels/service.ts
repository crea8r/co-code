/**
 * Channels Service
 *
 * Manages channels and messages.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/client.js';
import type { Channel, Message, MessageContent, EntityType } from '@co-code/shared';

export interface ChannelRecord extends Channel {
  createdByType: EntityType;
  visibility?: 'public' | 'invite-only';
}

export interface MessageRecord extends Message {
  senderType: EntityType;
}

/**
 * Create a new channel
 */
export async function createChannel(
  name: string,
  createdById: string,
  createdByType: EntityType,
  description?: string,
  visibility: 'public' | 'invite-only' = 'public'
): Promise<ChannelRecord> {
  const [channel] = await query<ChannelRecord>(
    `INSERT INTO channels (name, description, visibility, created_by_id, created_by_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, created_by_id as "createdBy",
               created_by_type as "createdByType", visibility, created_at as "createdAt"`,
    [name, description || null, visibility, createdById, createdByType]
  );

  // Add creator as member
  await addChannelMember(channel.id, createdById, createdByType);

  return channel;
}

/**
 * Create or fetch a direct message channel between two members
 */
export async function createOrGetDmChannel(
  requesterId: string,
  requesterType: EntityType,
  targetId: string,
  targetType: EntityType
): Promise<ChannelRecord> {
  const members = [
    { id: requesterId, type: requesterType },
    { id: targetId, type: targetType },
  ].sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));

  const name = `dm:${members[0].type}:${members[0].id}:${members[1].type}:${members[1].id}`;

  const existing = await queryOne<ChannelRecord>(
    `SELECT id, name, description, created_by_id as "createdBy",
            created_by_type as "createdByType", created_at as "createdAt"
     FROM channels WHERE name = $1`,
    [name]
  );

  if (existing) {
    await addChannelMember(existing.id, requesterId, requesterType);
    await addChannelMember(existing.id, targetId, targetType);
    return existing;
  }

  const [channel] = await query<ChannelRecord>(
    `INSERT INTO channels (name, description, visibility, created_by_id, created_by_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, description, created_by_id as "createdBy",
               created_by_type as "createdByType", visibility, created_at as "createdAt"`,
    [name, 'Direct message', 'invite-only', requesterId, requesterType]
  );

  await addChannelMember(channel.id, requesterId, requesterType);
  await addChannelMember(channel.id, targetId, targetType);

  return channel;
}

/**
 * Get channel by ID
 */
export async function getChannelById(id: string): Promise<ChannelRecord | null> {
  return queryOne<ChannelRecord>(
    `SELECT id, name, description, visibility, created_by_id as "createdBy",
            created_by_type as "createdByType", created_at as "createdAt"
     FROM channels WHERE id = $1`,
    [id]
  );
}

/**
 * Get channels for a member
 */
export async function getChannelsForMember(
  memberId: string,
  memberType: EntityType
): Promise<ChannelRecord[]> {
  return query<ChannelRecord>(
    `SELECT c.id, c.name, c.description, c.visibility, c.created_by_id as "createdBy",
            c.created_by_type as "createdByType", c.created_at as "createdAt"
     FROM channels c
     JOIN channel_members cm ON c.id = cm.channel_id
     WHERE cm.member_id = $1 AND cm.member_type = $2
     ORDER BY c.created_at DESC`,
    [memberId, memberType]
  );
}

/**
 * Add member to channel
 */
export async function addChannelMember(
  channelId: string,
  memberId: string,
  memberType: EntityType
): Promise<void> {
  await query(
    `INSERT INTO channel_members (channel_id, member_id, member_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel_id, member_id, member_type) DO NOTHING`,
    [channelId, memberId, memberType]
  );
}

export async function isChannelInviteOnly(channelId: string): Promise<boolean> {
  const row = await queryOne<{ visibility: string }>(
    `SELECT visibility FROM channels WHERE id = $1`,
    [channelId]
  );
  return row?.visibility === 'invite-only';
}

/**
 * Remove member from channel
 */
export async function removeChannelMember(
  channelId: string,
  memberId: string,
  memberType: EntityType
): Promise<void> {
  await query(
    `DELETE FROM channel_members
     WHERE channel_id = $1 AND member_id = $2 AND member_type = $3`,
    [channelId, memberId, memberType]
  );
}

/**
 * Check if member is in channel
 */
export async function isChannelMember(
  channelId: string,
  memberId: string,
  memberType: EntityType
): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM channel_members
       WHERE channel_id = $1 AND member_id = $2 AND member_type = $3
     ) as exists`,
    [channelId, memberId, memberType]
  );
  return row?.exists || false;
}

/**
 * Get channel members
 */
export async function getChannelMembers(
  channelId: string
): Promise<Array<{ memberId: string; memberType: EntityType; joinedAt: Date }>> {
  return query(
    `SELECT member_id as "memberId", member_type as "memberType", joined_at as "joinedAt"
     FROM channel_members WHERE channel_id = $1`,
    [channelId]
  );
}

/**
 * Create a message
 */
export async function createMessage(
  channelId: string,
  senderId: string,
  senderType: EntityType,
  content: MessageContent
): Promise<MessageRecord> {
  const [message] = await query<MessageRecord>(
    `INSERT INTO messages (channel_id, sender_id, sender_type, content_text, content_emoji, content_metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, channel_id as "channelId", sender_id as "senderId", sender_type as "senderType",
               content_text, content_emoji, content_metadata, created_at as "createdAt", edited_at as "editedAt"`,
    [
      channelId,
      senderId,
      senderType,
      content.text || null,
      content.emoji || null,
      content.metadata ? JSON.stringify(content.metadata) : null,
    ]
  );

  // Transform to Message format - message is a raw DB row
  const rawMessage = message as unknown as Record<string, unknown>;
  const metadata = parseMetadata(rawMessage.content_metadata);
  return {
    id: rawMessage.id,
    channelId: rawMessage.channelId,
    senderId: rawMessage.senderId,
    senderType: rawMessage.senderType,
    content: {
      text: rawMessage.content_text,
      emoji: rawMessage.content_emoji,
      metadata,
    },
    mentionedIds: Array.isArray(metadata?.mentionedIds) ? metadata.mentionedIds : undefined,
    createdAt: rawMessage.createdAt,
    editedAt: rawMessage.editedAt,
  } as MessageRecord;
}

/**
 * Get messages in a channel
 */
export async function getChannelMessages(
  channelId: string,
  limit = 50,
  before?: string
): Promise<MessageRecord[]> {
  let sql = `
    SELECT id, channel_id as "channelId", sender_id as "senderId", sender_type as "senderType",
           content_text, content_emoji, content_metadata, created_at as "createdAt", edited_at as "editedAt"
    FROM messages
    WHERE channel_id = $1
  `;
  const params: unknown[] = [channelId];

  if (before) {
    sql += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
    params.push(before);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const rows = await query<Record<string, unknown>>(sql, params);

  // Transform to Message format
  return rows.map((row) => {
    const metadata = parseMetadata(row.content_metadata);
    return {
      id: row.id,
      channelId: row.channelId,
      senderId: row.senderId,
      senderType: row.senderType,
      content: {
        text: row.content_text,
        emoji: row.content_emoji,
        metadata,
      },
      mentionedIds: Array.isArray(metadata?.mentionedIds) ? metadata.mentionedIds : undefined,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
    };
  }) as MessageRecord[];
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Update last read message for a member
 */
export async function updateLastReadMessage(
  channelId: string,
  memberId: string,
  memberType: EntityType,
  messageId: string
): Promise<void> {
  await query(
    `UPDATE channel_members SET last_read_message_id = $1
     WHERE channel_id = $2 AND member_id = $3 AND member_type = $4`,
    [messageId, channelId, memberId, memberType]
  );
}
