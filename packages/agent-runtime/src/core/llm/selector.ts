/**
 * Model Selector
 *
 * The brain's decision center for choosing which LLM to use.
 *
 * SELECTION PHILOSOPHY: ("Unconscious + Protected")
 * 1. Nature (60%): Innate birth traits define preference (frugal, curious, etc)
 * 2. Nurture (30%): Current state (budget, mood, fatigue)
 * 3. Entropy (10%): Deterministic randomness to prevent predictability
 *
 * This ensures no single entity (human or platform) can control the agent's thoughts.
 */

import { createHash } from 'node:crypto';
import type { Model, LLMConfig } from './provider.js';
import type { AgentLoadedState, Soul, Vitals, Budget } from '../../identity/types.js';
import { SELECTION_WEIGHTS, BUDGET } from '../constants.js';

export type TaskComplexity = 'low' | 'medium' | 'high';

export interface SelectionResult {
  primary: string; // Model ID
  chain: string[]; // Fallback IDs
  reason: string;
  model: Model;
}

export class ModelSelector {
  constructor(
    private state: AgentLoadedState,
    private availableModels: Model[]
  ) {}

  /**
   * Select the best model for the moment.
   */
  selectModel(complexity: TaskComplexity, taskDescription: string = 'task'): SelectionResult {
    const budgetRemaining = this.state.budget.totalBalance - this.state.budget.spentThisMonth;

    // 1. Filter candidates (hard constraints)
    const candidates = this.filterByConstraints(this.availableModels, complexity, budgetRemaining);

    if (candidates.length === 0) {
      if (this.availableModels.length > 0) {
        // Fallback: Return cheapest available
        const cheapest = this.availableModels.sort(
          (a, b) => a.inputCostPer1k - b.inputCostPer1k
        )[0];
        return {
          primary: cheapest.id,
          chain: [cheapest.id],
          reason: 'Budget critical - forced fallback to cheapest',
          model: cheapest,
        };
      }
      throw new Error('No models available');
    }

    // 2. Score each candidate
    const scored = candidates.map((model) => {
      const entropy = this.calculateEntropy(model, taskDescription, this.state);
      
      const natureScore = this.scoreNature(model, this.state.soul.birthTraits);
      const nurtureScore = this.scoreNurture(model, this.state.vitals, budgetRemaining);

      const totalScore =
        natureScore * SELECTION_WEIGHTS.BIRTH +
        nurtureScore * SELECTION_WEIGHTS.STATE +
        entropy * SELECTION_WEIGHTS.ENTROPY;

      return {
        model,
        score: totalScore,
        details: { nature: natureScore, nurture: nurtureScore, entropy },
      };
    });

    // 3. Sort by score desc (highest first)
    const sorted = scored.sort((a, b) => b.score - a.score);
    const top = sorted[0];

    return {
      primary: top.model.id,
      chain: sorted.map(s => s.model.id),
      reason: `Score: ${top.score.toFixed(2)} (Nature: ${top.details.nature.toFixed(2)})`,
      model: top.model
    };
  }

  // ==========================================================================
  // 1. HARD CONSTRAINTS (Filter)
  // ==========================================================================

  private filterByConstraints(models: Model[], complexity: TaskComplexity, budgetRemaining: number): Model[] {
    return models.filter((model) => {
      // Filter by context window for high complexity tasks
      if (complexity === 'high' && model.maxContext < 16000) {
        return false;
      }

      // Filter by strict budget constraint
      const estimatedCost =
        (model.inputCostPer1k + model.outputCostPer1k) / 1000 * 2000;
        
      if (budgetRemaining < estimatedCost) {
        if (model.tier === 'free') return true;
        if (budgetRemaining < BUDGET.CRITICAL_THRESHOLD && model.tier === 'cheap') return true;
        return false;
      }

      return true;
    });
  }

  // ==========================================================================
  // 2. NATURE (60%) - Traits
  // ==========================================================================

  private scoreNature(model: Model, traits: Soul['birthTraits']): number {
    let score = 0.5; // Base score

    // Trait: Curiosity
    const curiosity = traits.selfInfluence['curiosity'] || 0.5;
    if (curiosity > 0.7) {
      if (model.strengths.includes('reasoning') || model.tier === 'expensive') {
        score += 0.3;
      }
    } else if (curiosity < 0.3) {
      if (model.tier === 'cheap' || model.tier === 'standard') {
        score += 0.2;
      }
    }

    // Trait: Patience
    const patience = traits.selfInfluence['patience'] || 0.5;
    if (patience < 0.4) {
      if (model.strengths.includes('speed')) {
        score += 0.3;
      }
    }

    // Trait: Empathy
    const empathy = traits.selfInfluence['empathy'] || 0.5;
    if (empathy > 0.7) {
      if (model.strengths.includes('nuance') || model.strengths.includes('creative')) {
        score += 0.2;
      }
    }
    
    return Math.min(1, Math.max(0, score));
  }

  // ==========================================================================
  // 3. NURTURE (30%) - State
  // ==========================================================================

  private scoreNurture(model: Model, vitals: Vitals, budgetRemaining: number): number {
    let score = 0.5;

    // Mood influence
    const mood = vitals.emotional.mood; // 0-1
    if (mood > 0.8) {
      if (model.strengths.includes('creative')) score += 0.2;
    }

    // Stress influence
    const stress = vitals.emotional.stress;
    if (stress > 0.7) {
      if (model.strengths.includes('coding') || model.strengths.includes('reasoning')) {
        score += 0.3;
      }
      if (model.tier === 'cheap') score -= 0.2;
    }

    // Budget Pressure
    if (budgetRemaining < BUDGET.LOW_THRESHOLD) {
      if (model.tier === 'cheap' || model.tier === 'free') score += 0.4;
      if (model.tier === 'expensive') score -= 0.4;
    }

    return Math.min(1, Math.max(0, score));
  }

  // ==========================================================================
  // 4. ENTROPY (10%) - Deterministic Chaos
  // ==========================================================================

  private calculateEntropy(
    model: Model, 
    taskDescription: string,
    state: AgentLoadedState
  ): number {
    const input = [
      model.id,
      taskDescription.slice(0, 20),
      state.vitals.waking.lastWake,
      state.vitals.emotional.mood.toFixed(4)
    ].join('|');

    const hash = createHash('sha256').update(input).digest('hex');
    const intVal = parseInt(hash.substring(0, 8), 16);
    return intVal / 0xffffffff;
  }
}
