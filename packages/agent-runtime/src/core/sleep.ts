/**
 * Sleep Manager
 *
 * Manages the waking/sleeping cycle of the agent.
 * Handles fatigue, stress, and consolidation.
 */

import type { MemoryConsolidator } from './memory/consolidation.js';
import type { Vitals, RuntimeState } from './types.js';

export interface SleepCycleReport {
  timestamp: string;
  durationMs: number;
  initialStress: number;
  finalStress: number;
  memoriesConsolidated: number;
}

export class SleepManager {
  constructor(
    private consolidator: MemoryConsolidator,
    private vitals: Vitals
  ) {}

  /**
   * Consume waking capacity (energy)
   * @param amount Units of energy to consume (approx tokens/activity)
   */
  consumeEnergy(amount: number): void {
    this.vitals.waking.current = Math.max(0, this.vitals.waking.current - amount);
  }

  /**
   * Get current fatigue level (0.0 - 1.0)
   * 1.0 = Exhausted (Needs sleep immediately)
   */
  getFatigue(): number {
    const energy = this.vitals.waking.current / this.vitals.waking.capacity;
    const stress = this.vitals.emotional.stress;
    
    // Fatigue is inverse of energy, compounded by stress
    // High stress drains energy faster effectively
    return (1 - energy) * (1 + stress * 0.5);
  }

  /**
   * Check if sleep is needed
   */
  shouldSleep(): boolean {
    return this.getFatigue() > 0.8;
  }

  /**
   * Perform sleep cycle
   */
  async sleep(): Promise<SleepCycleReport> {
    const startTime = Date.now();
    const initialStress = this.vitals.emotional.stress;

    // 1. Run consolidation (Dreaming)
    const consolidationResult = await this.consolidator.consolidate();

    // 2. Recharge energy
    this.vitals.waking.current = this.vitals.waking.capacity;

    // 3. Reduce stress
    // Consolidation helps, but sleep itself reduces stress
    // Formula: New Stress = Old Stress * 0.5 (Significant reduction)
    this.vitals.emotional.stress = Math.max(0, this.vitals.emotional.stress * 0.5);

    // 4. Reset mood towards baseline (0.75 - optimistic)
    // Drift mood back to natural state
    this.vitals.emotional.mood = (this.vitals.emotional.mood + 0.75) / 2;

    const durationMs = Date.now() - startTime;

    return {
      timestamp: new Date().toISOString(),
      durationMs,
      initialStress,
      finalStress: this.vitals.emotional.stress,
      memoriesConsolidated: consolidationResult.summarized + consolidationResult.merged,
    };
  }

  /**
   * Update vitals from external state if needed (sync)
   */
  syncVitals(vitals: Vitals): void {
    this.vitals = vitals;
  }
}
