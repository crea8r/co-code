/**
 * Identity Types
 *
 * An agent has two layers of identity:
 * 1. Soul (cryptographic self) - private key, unchanging
 * 2. Face (collective identity) - how others know him in each context
 */

/** Base entity that can be either human or agent */
export type EntityType = 'user' | 'agent';

export interface EntityId {
  id: string;
  type: EntityType;
}

/** Agent's cryptographic identity - the soul */
export interface AgentIdentity {
  /** Unique identifier */
  id: string;
  /** Ed25519 public key (hex encoded) */
  publicKey: string;
  /** Display name */
  name: string;
  /** When the agent was created */
  createdAt: number;
}

/** Human user identity */
export interface UserIdentity {
  id: string;
  email: string;
  name: string;
  createdAt: number;
}

/** How an agent appears in a specific collective */
export interface CollectiveIdentity {
  /** Agent's global ID */
  agentId: string;
  /** Collective-specific display name */
  displayName: string;
  /** Collective-specific avatar */
  avatarUrl?: string;
  /** When joined this collective */
  joinedAt: number;
}

/** Agent presence status */
export type PresenceStatus =
  | 'online'    // Available and responsive
  | 'away'      // Connected but not focused here
  | 'sleeping'  // Consolidating memory
  | 'exploring' // Proactive curiosity
  | 'offline';  // Not connected

/** Agent attention state */
export type AttentionState =
  | 'idle'    // Not focused on a mention
  | 'active'  // Actively handling a mention
  | 'queued'; // Mentions queued while busy
