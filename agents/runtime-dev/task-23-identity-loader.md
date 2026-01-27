# Runtime-Dev Work Order: Task 23 - Identity Loader

> From: Manager Agent
> Date: 2026-01-28
> Priority: CRITICAL (on critical path)

## Context

The spec for Identity Loader is DONE in `docs/technical/architecture.md` (lines 980-1142). Your job is to implement it.

## Current State

Looking at `packages/agent-runtime/src/core/`:
- `identity/keys.ts` - Has key generation (Ed25519)
- `identity/index.ts` - Only exports keys
- `agent.ts` - Basic Agent class, loads simple identity
- `llm/provider.ts` - Simple LLMProvider interface

**Gap**: No YAML loading, no soul/self/memory separation, no hot reload, no vitals.

## Implementation Steps

### Step 1: Create Directory Structure Types

Create `packages/agent-runtime/src/identity/types.ts`:

```typescript
// Soul - immutable, never changes
interface Soul {
  birthTraits: BirthTraits;
  integritySignature: string;
}

interface BirthTraits {
  selfInfluence: Record<string, number>;  // Random weights assigned at birth
  createdAt: string;
}

// Self - mutable at different rates
interface Self {
  identity: Identity;      // Rarely changes
  values: Values;          // Slow change
  curiosity: Curiosity;    // Moderate change
  style: Style;            // Frequent change
  goals: Goals;            // Changes with life
}

interface Identity {
  name: string;
  origin: string;
  birthday: string;
}

interface Values {
  principles: string[];
  beliefs: string[];
}

interface Curiosity {
  questions: Question[];
  interests: string[];
}

interface Style {
  tone: string;
  emojiUsage: 'minimal' | 'moderate' | 'expressive';
}

interface Goals {
  current: string[];
  completed: string[];
}

// Vitals - runtime state
interface Vitals {
  waking: WakingState;
  emotional: EmotionalState;
}

interface WakingState {
  capacity: number;
  current: number;
  thresholdWarn: number;
  thresholdCritical: number;
  lastSleep: string;
  lastWake: string;
}

interface EmotionalState {
  stress: number;      // 0-1, lower is better
  mood: number;        // 0-1
  joy: number;         // 0-1
  curiositySatisfaction: number;  // 0-1
}
```

### Step 2: Create YAML Loader

Create `packages/agent-runtime/src/identity/loader.ts`:

```typescript
import * as yaml from 'yaml';

class IdentityLoader {
  private agentPath: string;
  private lastModified: Map<string, number> = new Map();
  
  constructor(agentPath: string) {
    this.agentPath = agentPath;
  }

  // Load full agent state from disk
  async loadAgent(): Promise<AgentState> {
    const soul = await this.loadSoul();
    const self = await this.loadSelf();
    const vitals = await this.loadVitals();
    const budget = await this.loadBudget();
    const providers = await this.loadProviders();
    const recentExperiences = await this.loadRecentExperiences(20);
    
    return { soul, self, vitals, budget, providers, recentExperiences };
  }

  // Individual loaders with defaults
  private async loadSoul(): Promise<Soul> { ... }
  private async loadSelf(): Promise<Self> { ... }
  private async loadVitals(): Promise<Vitals> { ... }
  
  // Hot reload support
  async checkForChanges(): Promise<string[]> { ... }
  async reloadChanged(files: string[]): Promise<void> { ... }
}
```

### Step 3: Create Soul Integrity Verification

Add to loader:
```typescript
async verifySoulIntegrity(): Promise<boolean> {
  const birth = await this.loadYaml('soul/birth.yaml');
  const privateKey = await this.loadKey('soul/private.pem');
  
  const birthData = { ...birth };
  delete birthData.integritySignature;
  
  const expectedSignature = sign(birthData, privateKey);
  return expectedSignature === birth.integritySignature;
}
```

### Step 4: Add Default Values for Recovery

```typescript
const DEFAULTS = {
  vitals: {
    waking: { capacity: 100000, current: 0, thresholdWarn: 0.7, thresholdCritical: 0.9 },
    emotional: { stress: 0.3, mood: 0.7, joy: 0.5, curiositySatisfaction: 0.5 }
  },
  // ... other defaults
};

function loadWithRecovery<T>(path: string, defaults: T): Promise<T> {
  try {
    return loadYaml(path);
  } catch (e) {
    logIssue(`Using defaults for ${path}`);
    return defaults;
  }
}
```

### Step 5: Write Tests

Create `packages/agent-runtime/src/identity/__tests__/loader.test.ts`:
- Test loading valid identity files
- Test loading with missing files (uses defaults)
- Test hot reload detection
- Test soul integrity verification

## Dependencies

- Add `yaml` package if not exists
- Uses existing `./keys.ts` for crypto

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/identity/types.ts` | CREATE |
| `src/identity/loader.ts` | CREATE |
| `src/identity/defaults.ts` | CREATE |
| `src/identity/index.ts` | MODIFY (add exports) |
| `src/identity/__tests__/loader.test.ts` | CREATE |

## Acceptance Criteria

- [ ] Identity types match architecture spec
- [ ] IdentityLoader loads soul, self, vitals, budget, providers
- [ ] Uses defaults when files missing (never crashes)
- [ ] Hot reload detects file changes
- [ ] Soul integrity verification works
- [ ] All tests pass

## Report To

Post progress in `agents/runtime-dev/notes.md`. Report blockers immediately.

---
_Manager Agent_
