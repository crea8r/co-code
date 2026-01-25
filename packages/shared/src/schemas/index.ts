/**
 * Zod Schemas for Runtime Validation
 *
 * These schemas validate data at boundaries:
 * - API requests/responses
 * - WebSocket messages
 * - Stored data
 */

import { z } from 'zod';

// ============================================
// Identity Schemas
// ============================================

export const EntityTypeSchema = z.enum(['user', 'agent']);

export const PresenceStatusSchema = z.enum([
  'online',
  'away',
  'sleeping',
  'exploring',
  'offline',
]);

// ============================================
// Message Schemas
// ============================================

export const DiagramBlockSchema = z.object({
  type: z.enum(['mermaid', 'plantuml', 'd2', 'excalidraw']),
  source: z.string(),
  title: z.string().optional(),
});

export const ImageRefSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export const MessageContentSchema = z.object({
  text: z.string().optional(),
  emoji: z.array(z.string()).optional(),
  diagrams: z.array(DiagramBlockSchema).optional(),
  images: z.array(ImageRefSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const MessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderType: EntityTypeSchema,
  content: MessageContentSchema,
  createdAt: z.number(),
  editedAt: z.number().nullable(),
});

// ============================================
// Credit Schemas
// ============================================

export const CreditTransactionSchema = z.object({
  id: z.string().uuid(),
  fromId: z.string().uuid().nullable(),
  fromType: EntityTypeSchema.nullable(),
  toId: z.string().uuid(),
  toType: EntityTypeSchema,
  amount: z.number().positive(),
  fee: z.number().nonnegative(),
  type: z.enum(['mint', 'transfer']),
  createdAt: z.number(),
  memo: z.string().optional(),
});

// ============================================
// WebSocket Event Schemas
// ============================================

export const AuthenticateEventSchema = z.object({
  type: z.literal('authenticate'),
  token: z.string(),
  timestamp: z.number(),
});

export const JoinChannelEventSchema = z.object({
  type: z.literal('join_channel'),
  channelId: z.string().uuid(),
  timestamp: z.number(),
});

export const LeaveChannelEventSchema = z.object({
  type: z.literal('leave_channel'),
  channelId: z.string().uuid(),
  timestamp: z.number(),
});

export const SendMessageEventSchema = z.object({
  type: z.literal('send_message'),
  channelId: z.string().uuid(),
  content: MessageContentSchema,
  timestamp: z.number(),
});

export const TypingEventSchema = z.object({
  type: z.literal('typing'),
  channelId: z.string().uuid(),
  timestamp: z.number(),
});

export const SetStatusEventSchema = z.object({
  type: z.literal('set_status'),
  status: PresenceStatusSchema,
  timestamp: z.number(),
});

export const ClientEventSchema = z.discriminatedUnion('type', [
  AuthenticateEventSchema,
  JoinChannelEventSchema,
  LeaveChannelEventSchema,
  SendMessageEventSchema,
  TypingEventSchema,
  SetStatusEventSchema,
]);

// ============================================
// API Request/Response Schemas
// ============================================

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const CreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  selfIdentity: z.string().min(1).max(2000),
  selfValues: z.string().min(1).max(2000),
  selfCuriosity: z.string().max(2000).optional(),
  styleTone: z.string().max(200).optional(),
  styleEmojiUsage: z.enum(['minimal', 'moderate', 'expressive']).optional(),
  styleFavoriteEmoji: z.array(z.string()).max(10).optional(),
  avatarColors: z.array(z.string()).max(5).optional(),
  avatarExpression: z.string().max(100).optional(),
});

export const CreateChannelRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const TransferCreditsRequestSchema = z.object({
  toId: z.string().uuid(),
  toType: EntityTypeSchema,
  amount: z.number().positive(),
  memo: z.string().max(200).optional(),
});

export const MintCreditsRequestSchema = z.object({
  amount: z.number().positive(),
  // Payment info would go here in real implementation
});

// ============================================
// Memory Schemas (for agent runtime)
// ============================================

export const AgentStyleSchema = z.object({
  tone: z.string(),
  emojiUsage: z.enum(['minimal', 'moderate', 'expressive']),
  favoriteEmoji: z.array(z.string()),
});

export const AgentAvatarSchema = z.object({
  imageUrl: z.string().url().optional(),
  colors: z.array(z.string()),
  expression: z.string(),
});

export const CuriosityQuestionSchema = z.object({
  question: z.string(),
  interest: z.number().min(0).max(1),
  addedAt: z.number(),
  exploredAt: z.number().nullable(),
});

export const CuriosityFindingSchema = z.object({
  question: z.string(),
  finding: z.string(),
  savedTo: z.string(),
  foundAt: z.number(),
});

export const CuriosityStateSchema = z.object({
  questions: z.array(CuriosityQuestionSchema),
  recentFindings: z.array(CuriosityFindingSchema),
});

export const AgentSelfSchema = z.object({
  identity: z.string(),
  values: z.string(),
  curiosity: CuriosityStateSchema,
  goals: z.object({
    short: z.string(),
    long: z.string(),
  }),
  style: AgentStyleSchema,
  avatar: AgentAvatarSchema,
});

export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
  accessCount: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
});

export const MemoryPointerSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  type: z.enum(['file', 'url', 'message', 'pointer']),
  reference: z.string(),
  createdAt: z.number(),
  lastAccessedAt: z.number(),
});
