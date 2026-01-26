/**
 * Auth Service
 *
 * Handles user registration, login, and JWT token management.
 * Both humans and agents authenticate with JWT.
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/client.js';
import type { EntityType } from '@co-code/shared';

const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status?: string;
  lastSeenAt?: Date | null;
  createdAt: Date;
}

export interface AgentRecord {
  id: string;
  name: string;
  publicKey: string;
  creatorId: string;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
}

export interface JWTPayload {
  sub: string;
  type: EntityType;
  iat: number;
  exp: number;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<User> {
  // Check if email exists
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existing) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const [user] = await query<User>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, avatar_url as "avatarUrl", status,
               last_seen_at as "lastSeenAt", created_at as "createdAt"`,
    [email.toLowerCase(), passwordHash, name]
  );

  // Initialize credits
  await query(
    `INSERT INTO credits (owner_id, owner_type, balance)
     VALUES ($1, 'user', 0)`,
    [user.id]
  );

  return user;
}

/**
 * Authenticate user with email/password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  const row = await queryOne<User & { password_hash: string }>(
    `SELECT id, email, name, avatar_url as "avatarUrl", status,
            last_seen_at as "lastSeenAt", created_at as "createdAt", password_hash
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (!row) {
    return null;
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return null;
  }

  const { password_hash: _, ...user } = row;
  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    `SELECT id, email, name, avatar_url as "avatarUrl", status,
            last_seen_at as "lastSeenAt", created_at as "createdAt"
     FROM users WHERE id = $1`,
    [id]
  );
}

/**
 * Get all users
 */
export async function getUsers(): Promise<User[]> {
  return query<User>(
    `SELECT id, email, name, avatar_url as "avatarUrl", status,
            last_seen_at as "lastSeenAt", created_at as "createdAt"
     FROM users
     ORDER BY created_at DESC`
  );
}

/**
 * Register a new agent
 */
export async function registerAgent(
  id: string,
  name: string,
  publicKey: string,
  creatorId: string,
  config: {
    selfIdentity: string;
    selfValues: string;
    selfCuriosity?: string;
    styleTone?: string;
    styleEmojiUsage?: string;
    styleFavoriteEmoji?: string[];
    avatarColors?: string[];
    avatarExpression?: string;
  }
): Promise<AgentRecord> {
  // Create agent
  const [agent] = await query<AgentRecord>(
    `INSERT INTO agents (id, name, public_key, creator_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, public_key as "publicKey", creator_id as "creatorId",
               avatar_url as "avatarUrl", status, created_at as "createdAt"`,
    [id, name, publicKey, creatorId]
  );

  // Create config
  await query(
    `INSERT INTO agent_configs (
       agent_id, self_identity, self_values, self_curiosity,
       style_tone, style_emoji_usage, style_favorite_emoji,
       avatar_colors, avatar_expression
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      config.selfIdentity,
      config.selfValues,
      config.selfCuriosity || null,
      config.styleTone || 'Friendly and professional',
      config.styleEmojiUsage || 'moderate',
      config.styleFavoriteEmoji || ['✨', '🎯', '💡'],
      config.avatarColors || ['#3B82F6', '#1E40AF'],
      config.avatarExpression || 'focused',
    ]
  );

  // Initialize credits
  await query(
    `INSERT INTO credits (owner_id, owner_type, balance)
     VALUES ($1, 'agent', 0)`,
    [id]
  );

  return agent;
}

/**
 * Get agent by ID
 */
export async function getAgentById(id: string): Promise<AgentRecord | null> {
  return queryOne<AgentRecord>(
    `SELECT id, name, public_key as "publicKey", creator_id as "creatorId",
            avatar_url as "avatarUrl", status, created_at as "createdAt"
     FROM agents WHERE id = $1`,
    [id]
  );
}

/**
 * Get agent config
 */
export async function getAgentConfig(agentId: string): Promise<{
  selfIdentity: string;
  selfValues: string;
  selfCuriosity: string | null;
  styleTone: string;
  styleEmojiUsage: string;
  styleFavoriteEmoji: string[];
  avatarColors: string[];
  avatarExpression: string;
} | null> {
  return queryOne(
    `SELECT
       self_identity as "selfIdentity",
       self_values as "selfValues",
       self_curiosity as "selfCuriosity",
       style_tone as "styleTone",
       style_emoji_usage as "styleEmojiUsage",
       style_favorite_emoji as "styleFavoriteEmoji",
       avatar_colors as "avatarColors",
       avatar_expression as "avatarExpression"
     FROM agent_configs WHERE agent_id = $1`,
    [agentId]
  );
}

/**
 * Update agent status
 */
export async function updateAgentStatus(
  agentId: string,
  status: string
): Promise<void> {
  await query(
    `UPDATE agents SET status = $1, last_seen_at = NOW() WHERE id = $2`,
    [status, agentId]
  );
}

/**
 * Update user status
 */
export async function updateUserStatus(
  userId: string,
  status: string
): Promise<void> {
  await query(
    `UPDATE users SET status = $1, last_seen_at = NOW() WHERE id = $2`,
    [status, userId]
  );
}

/**
 * Get agents by creator
 */
export async function getAgentsByCreator(
  creatorId: string
): Promise<AgentRecord[]> {
  return query<AgentRecord>(
    `SELECT id, name, public_key as "publicKey", creator_id as "creatorId",
            avatar_url as "avatarUrl", status, created_at as "createdAt"
     FROM agents WHERE creator_id = $1
     ORDER BY created_at DESC`,
    [creatorId]
  );
}
