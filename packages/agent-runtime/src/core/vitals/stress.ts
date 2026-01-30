/**
 * Stress computation helper.
 */

import type { Self, Vitals } from '../../identity/types.js';

export function computeStress(self: Self, vitals: Vitals): number {
  const unresolved = self.curiosity.questions.filter((q) => !q.resolvedAt).length;
  const curiosityGap = 1 - vitals.emotional.curiositySatisfaction;
  const moodPenalty = 1 - vitals.emotional.mood;
  const baseStress = vitals.emotional.stress;

  const stress =
    baseStress * 0.4 +
    moodPenalty * 0.3 +
    curiosityGap * 0.2 +
    Math.min(1, unresolved / 10) * 0.1;

  return Math.max(0, Math.min(1, stress));
}
