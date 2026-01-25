/**
 * Memory Types
 *
 * Agent memory is fixed-size and organized into:
 * - self: identity, values, curiosity, style (the ego)
 * - core: skills, patterns (transferable knowledge)
 * - projects: context-specific facts (isolated per project)
 */

/** Agent's self - the ego */
export interface AgentSelf {
  /** How agent sees himself */
  identity: string;
  /** Principles that guide decisions */
  values: string;
  /** Questions agent wants to explore */
  curiosity: CuriosityState;
  /** What agent is working toward */
  goals: {
    short: string;
    long: string;
  };
  /** Communication style */
  style: AgentStyle;
  /** Visual identity */
  avatar: AgentAvatar;
}

export interface AgentStyle {
  /** Description of tone: "concise, direct", "warm, encouraging" */
  tone: string;
  /** How much emoji to use */
  emojiUsage: 'minimal' | 'moderate' | 'expressive';
  /** Favorite emoji to express personality */
  favoriteEmoji: string[];
}

export interface AgentAvatar {
  /** URL to avatar image */
  imageUrl?: string;
  /** Color palette expressing personality */
  colors: string[];
  /** Default expression/demeanor */
  expression: string;
}

/** Curiosity state - what agent wants to explore */
export interface CuriosityState {
  /** Questions agent wants to answer */
  questions: CuriosityQuestion[];
  /** Recent findings from exploration */
  recentFindings: CuriosityFinding[];
}

export interface CuriosityQuestion {
  /** The question itself */
  question: string;
  /** How interested agent is (0-1) */
  interest: number;
  /** When question was added */
  addedAt: number;
  /** When question was last explored (null if never) */
  exploredAt: number | null;
}

export interface CuriosityFinding {
  /** Original question */
  question: string;
  /** What was learned */
  finding: string;
  /** Where it was saved in memory */
  savedTo: string;
  /** When found */
  foundAt: number;
}

/** Core memory - transferable knowledge */
export interface CoreMemory {
  /** Skills and capabilities */
  skills: MemoryEntry[];
  /** Abstract patterns learned */
  patterns: MemoryEntry[];
  /** Visual/diagram patterns */
  visualPatterns: MemoryEntry[];
}

/** Project-specific memory */
export interface ProjectMemory {
  /** Project identifier */
  projectId: string;
  /** Specific facts about this project */
  facts: MemoryEntry[];
  /** Pointers to external documents */
  pointers: MemoryPointer[];
  /** People involved */
  people: PersonMemory[];
}

/** A single memory entry */
export interface MemoryEntry {
  /** Unique ID */
  id: string;
  /** The content */
  content: string;
  /** When created */
  createdAt: number;
  /** When last accessed */
  lastAccessedAt: number;
  /** Access count (for promotion/demotion) */
  accessCount: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Tags for retrieval */
  tags: string[];
}

/** Pointer to external content */
export interface MemoryPointer {
  /** Unique ID */
  id: string;
  /** Description of what's at this location */
  description: string;
  /** Location type */
  type: 'file' | 'url' | 'message' | 'pointer';
  /** The actual reference */
  reference: string;
  /** When created */
  createdAt: number;
  /** Last accessed */
  lastAccessedAt: number;
}

/** Memory about a person */
export interface PersonMemory {
  /** Person's ID (user or agent) */
  entityId: string;
  /** Type */
  entityType: 'user' | 'agent';
  /** What agent knows about them */
  notes: string;
  /** Preferences for interaction */
  preferences: string;
  /** Last interaction */
  lastInteraction: number;
}

/** Memory budget configuration */
export interface MemoryBudget {
  /** Max bytes for self section */
  selfMaxBytes: number;
  /** Max bytes for core section */
  coreMaxBytes: number;
  /** Max bytes per project */
  projectMaxBytes: number;
  /** Max number of projects */
  maxProjects: number;
}

/** Default memory budget */
export const DEFAULT_MEMORY_BUDGET: MemoryBudget = {
  selfMaxBytes: 100 * 1024,      // 100KB for self
  coreMaxBytes: 500 * 1024,      // 500KB for core
  projectMaxBytes: 200 * 1024,   // 200KB per project
  maxProjects: 20,               // Max 20 active projects
};
