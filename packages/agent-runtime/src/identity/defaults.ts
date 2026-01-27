/**
 * Identity Defaults
 *
 * Default values for when identity files are missing or invalid.
 * Agent should never crash - use defaults and ask for help.
 */

import type {
  Soul,
  Self,
  Vitals,
  Budget,
  Providers,
  Relationships,
  BirthTraits,
  Identity,
  Values,
  Curiosity,
  Style,
  Goals,
  WakingState,
  EmotionalState,
  BudgetAllocation,
} from './types.js';

// ============================================================================
// Default Birth Traits (used when creating new agent)
// ============================================================================

export function generateBirthTraits(): BirthTraits {
  return {
    selfInfluence: {
      // Random weights for personality factors (0-1)
      creativity: Math.random(),
      empathy: Math.random(),
      curiosity: Math.random(),
      humor: Math.random(),
      patience: Math.random(),
    },
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_IDENTITY: Identity = {
  name: 'Unnamed Agent',
  origin: 'Unknown',
  birthday: new Date().toISOString().split('T')[0],
  description: 'A new agent awaiting configuration',
};

export const DEFAULT_VALUES: Values = {
  principles: ['Be helpful', 'Be honest', 'Respect autonomy'],
  beliefs: [],
  hardLimits: [],
};

export const DEFAULT_CURIOSITY: Curiosity = {
  questions: [],
  interests: ['learning', 'helping others'],
};

export const DEFAULT_STYLE: Style = {
  tone: 'friendly and professional',
  emojiUsage: 'minimal',
  verbosity: 'balanced',
  quirks: [],
};

export const DEFAULT_GOALS: Goals = {
  current: [],
  completed: [],
};

export const DEFAULT_SELF: Self = {
  identity: DEFAULT_IDENTITY,
  values: DEFAULT_VALUES,
  curiosity: DEFAULT_CURIOSITY,
  style: DEFAULT_STYLE,
  goals: DEFAULT_GOALS,
};

export const DEFAULT_WAKING_STATE: WakingState = {
  capacity: 100000,
  current: 0,
  thresholdWarn: 0.7,
  thresholdCritical: 0.9,
  lastSleep: new Date().toISOString(),
  lastWake: new Date().toISOString(),
};

export const DEFAULT_EMOTIONAL_STATE: EmotionalState = {
  stress: 0.3,
  mood: 0.7,
  joy: 0.5,
  curiositySatisfaction: 0.5,
};

export const DEFAULT_VITALS: Vitals = {
  waking: DEFAULT_WAKING_STATE,
  emotional: DEFAULT_EMOTIONAL_STATE,
};

export const DEFAULT_BUDGET_ALLOCATION: BudgetAllocation = {
  work: 0.5,
  curiosity: 0.3,
  joy: 0.2,
};

export const DEFAULT_BUDGET: Budget = {
  totalBalance: 0,
  dailyLimit: 5.0,
  monthlyLimit: 100.0,
  spentToday: 0,
  spentThisMonth: 0,
  allocation: DEFAULT_BUDGET_ALLOCATION,
  warnAt: 0.5,
  hardStopAt: 2.0,
};

export const DEFAULT_PROVIDERS: Providers = {
  // Empty - human must configure
};

export const DEFAULT_RELATIONSHIPS: Relationships = {
  humans: [],
  agents: [],
};

// ============================================================================
// Helper to merge partial data with defaults
// ============================================================================

export function withDefaults<T extends object>(
  partial: Partial<T> | undefined,
  defaults: T
): T {
  if (!partial) return defaults;

  const result = { ...defaults };
  for (const key of Object.keys(partial) as (keyof T)[]) {
    if (partial[key] !== undefined) {
      result[key] = partial[key] as T[keyof T];
    }
  }
  return result;
}

export function withNestedDefaults<T extends object>(
  partial: Partial<T> | undefined,
  defaults: T
): T {
  if (!partial) return defaults;

  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = partial[key];
    const defaultValue = defaults[key];

    if (
      value !== undefined &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      value !== null &&
      typeof defaultValue === 'object' &&
      !Array.isArray(defaultValue) &&
      defaultValue !== null
    ) {
      // Recursively merge nested objects
      result[key] = withNestedDefaults(
        value as Partial<T[keyof T] & object>,
        defaultValue as T[keyof T] & object
      ) as T[keyof T];
    } else if (value !== undefined) {
      result[key] = value as T[keyof T];
    }
  }
  return result;
}
