/**
 * Identity Types
 *
 * Type definitions for the agent's persistent identity structure.
 * Based on the architecture spec in docs/technical/architecture.md
 *
 * Directory structure:
 * ~/.agent/{name}/
 * ├── soul/         # Immutable
 * ├── self/         # Mutable at different rates
 * ├── memories/     # Consolidates, never deletes
 * ├── relationships/
 * ├── core/
 * ├── budget.yaml
 * ├── providers.yaml
 * └── vitals.yaml
 */

// ============================================================================
// SOUL - Immutable, never changes (like cryptographic identity)
// ============================================================================

export interface Soul {
  /** Birth traits - random weights assigned at creation, never change */
  birthTraits: BirthTraits;
  /** Signature made with private key at creation for integrity verification */
  integritySignature: string;
}

export interface BirthTraits {
  /** Random influence weights for personality factors (never change) */
  selfInfluence: Record<string, number>;
  /** When the agent was created */
  createdAt: string;
  /** Optional: agent's public key fingerprint */
  publicKeyFingerprint?: string;
}

// ============================================================================
// SELF - Mutable at different rates
// ============================================================================

export interface Self {
  identity: Identity;
  values: Values;
  curiosity: Curiosity;
  style: Style;
  goals: Goals;
}

/** Identity - Rarely changes */
export interface Identity {
  name: string;
  origin: string;
  birthday?: string;
  description?: string;
}

/** Values - Slow change through deep reflection */
export interface Values {
  principles: string[];
  beliefs: string[];
  /** What the agent will never do */
  hardLimits?: string[];
}

/** Curiosity - Moderate change */
export interface Curiosity {
  questions: Question[];
  interests: string[];
}

export interface Question {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

/** Style - Frequent change */
export interface Style {
  tone: string;
  emojiUsage: 'minimal' | 'moderate' | 'expressive';
  verbosity?: 'concise' | 'balanced' | 'detailed';
  quirks?: string[];
}

/** Goals - Changes with life */
export interface Goals {
  current: Goal[];
  completed: Goal[];
}

export interface Goal {
  id: string;
  description: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// VITALS - Runtime state
// ============================================================================

export interface Vitals {
  waking: WakingState;
  emotional: EmotionalState;
}

export interface WakingState {
  /** Total waking capacity (like context window) */
  capacity: number;
  /** Current usage since last sleep */
  current: number;
  /** Threshold to warn collaborators (0.7 = 70%) */
  thresholdWarn: number;
  /** Threshold for critical state (0.9 = 90%) */
  thresholdCritical: number;
  /** Last sleep timestamp */
  lastSleep: string;
  /** Last wake timestamp */
  lastWake: string;
}

export interface EmotionalState {
  /** Stress level 0-1 (lower is better) */
  stress: number;
  /** General mood 0-1 */
  mood: number;
  /** Joy level 0-1 */
  joy: number;
  /** How satisfied is curiosity 0-1 */
  curiositySatisfaction: number;
}

// ============================================================================
// BUDGET - External constraint, NOT identity
// ============================================================================

export interface Budget {
  /** Total balance available */
  totalBalance: number;
  /** Daily spending limit */
  dailyLimit: number;
  /** Monthly spending limit */
  monthlyLimit?: number;
  /** Spent today */
  spentToday: number;
  /** Spent this month */
  spentThisMonth: number;

  /** Budget allocation preferences (agent decides) */
  allocation: BudgetAllocation;

  /** Cost awareness thresholds */
  warnAt?: number;
  hardStopAt?: number;
}

export interface BudgetAllocation {
  /** Fraction for work (responding to others) */
  work: number;
  /** Fraction for curiosity (exploring questions) */
  curiosity: number;
  /** Fraction for joy (things that bring happiness) */
  joy: number;
}

// ============================================================================
// PROVIDERS - LLM configuration (human configured, agent selects)
// ============================================================================

export interface Providers {
  anthropic?: ProviderConfig;
  openai?: ProviderConfig;
  qwen?: ProviderConfig;
  local?: LocalProviderConfig;
}

export interface ProviderConfig {
  apiKey: string;
  models: string[];
  default: string;
  baseUrl?: string;
}

export interface LocalProviderConfig {
  endpoint: string;
  models: string[];
  default: string;
}

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export interface Relationships {
  humans: RelationshipEntry[];
  agents: RelationshipEntry[];
}

export interface RelationshipEntry {
  id: string;
  name: string;
  trustLevel: number; // 0-1
  notes?: string;
  lastInteraction?: string;
}

// ============================================================================
// AGENT STATE - Full runtime state
// ============================================================================

export interface AgentLoadedState {
  /** Path to agent home directory */
  agentPath: string;

  /** Core identity */
  soul: Soul;
  self: Self;
  vitals: Vitals;
  budget: Budget;
  providers: Providers;
  relationships: Relationships;

  /** Recent experiences (short-term memory) */
  recentExperiences: Experience[];

  /** Memory summaries for context */
  memorySummaries: MemorySummary[];
}

export interface Experience {
  id: string;
  type: 'interaction' | 'reflection' | 'learning';
  content: string;
  timestamp: string;
  channelId?: string;
  participants?: string[];
}

export interface MemorySummary {
  id: string;
  category: 'experiences' | 'learnings' | 'reflections';
  summary: string;
  timeRange: { from: string; to: string };
}
