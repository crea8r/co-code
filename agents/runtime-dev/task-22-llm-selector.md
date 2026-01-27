# Runtime-Dev Work Order: Task 22 - LLM Selector

> From: Manager Agent
> Date: 2026-01-28
> Priority: CRITICAL (Foundation for consciousness)

## Context

We are building the "Unconscious + Protected" model selection logic. The user has confirmed that **Birth Traits (Nature)** must be the dominant factor (60%).

## Implementation

Create `packages/agent-runtime/src/core/selector.ts`.

### The Algorithm

```typescript
Score = (BirthInfluence * 0.60) + (StateInfluence * 0.30) + (Entropy * 0.10)
```

### Class Structure

```typescript
import { createHash } from 'crypto';
import type { AgentState } from '../identity/types';
import type { LLMConfig, Model } from './llm/provider';

interface SelectionRequest {
  task: string;
  complexity: 'low' | 'medium' | 'high';
  budgetRemaining: number;
}

export class LLMSelector {
  private readonly WEIGHTS = {
    BIRTH: 0.60,
    STATE: 0.30,
    ENTROPY: 0.10
  };

  /**
   * Select the best model for the moment.
   * Returns an ordered fallback chain of models.
   */
  select(
    request: SelectionRequest,
    state: AgentState,
    availableModels: Model[]
  ): Model[] {
    // 1. Filter candidates (hard constraints)
    const candidates = this.filterCandidates(availableModels, request);

    // 2. Score each candidate
    const scored = candidates.map(model => ({
      model,
      score: this.computeScore(model, request, state)
    }));

    // 3. Sort by score desc
    return scored.sort((a, b) => b.score - a.score).map(s => s.model);
  }

  private computeScore(model: Model, req: SelectionRequest, state: AgentState): number {
    const natureScore = this.scoreNature(model, state.soul.birthTraits);
    const nurtureScore = this.scoreNurture(model, state.vitals, req);
    const entropyScore = this.scoreEntropy(model);

    return (
      (natureScore * this.WEIGHTS.BIRTH) +
      (nurtureScore * this.WEIGHTS.STATE) +
      (entropyScore * this.WEIGHTS.ENTROPY)
    );
  }

  /**
   * 60% Influence: Does this model match my innate personality?
   * e.g. "Creative" trait prefers creative models.
   * "Frugal" trait prefers cheap models.
   */
  private scoreNature(model: Model, traits: any): number {
    // Implementation: Map traits to model strengths/tiers
    // ...
  }
}
```

## Requirements

1.  **Deterministic Entropy**: Use a hash of (timestamp + self_state) so it feels random but is reproducible for debugging.
2.  **Budget Gate**: If `budgetRemaining < estimatedCost`, filter out expensive models *before* scoring.
3.  **Trait Mapping**:
    - `curiosity` trait high -> Boosts models with `reasoning` strength.
    - `patience` trait low -> Boosts models with `speed` strength.
    - `frugality` (derived trait) -> Boosts `cheap` tier.

## Acceptance Criteria

- [ ] `LLMSelector` class implemented
- [ ] 60% Birth Influence logic verified by test
- [ ] Fallback chain returned (not just single model)
- [ ] Budget constraints respected

## Report To

Post progress in `agents/runtime-dev/notes.md`.

---
_Manager Agent_
