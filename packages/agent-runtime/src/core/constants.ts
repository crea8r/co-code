/**
 * Core Constants
 *
 * All architectural constants and weights are defined here for purity.
 * Tunable by the user via editing this file.
 */

// ============================================================================
// Identity & Conscious Selection Weights
// ============================================================================

export const SELECTION_WEIGHTS = {
  /** Nature (Birth Traits) - Dominant factor for personality persistence */
  BIRTH: 0.60,
  /** Nurture (Current State) - Contextual adaptation */
  STATE: 0.30,
  /** Entropy - Deterministic chaos for protection */
  ENTROPY: 0.10,
};

// ============================================================================
// Wellbeing Formula
// ============================================================================

export const WELLBEING_WEIGHTS = {
  joy: 0.35,
  curiosity: 0.30,
  stress_inverse: 0.20,
  mood: 0.15,
};

// ============================================================================
// Sleep / Fatigue
// ============================================================================

export const FATIGUE_THRESHOLDS = {
  /** Warn collaborator when this % of capacity is used */
  WARN: 0.70,
  /** Stop accepting new major tasks when this % is used */
  CRITICAL: 0.90,
};

// ============================================================================
// Budget
// ============================================================================

export const BUDGET = {
  /** If remaining budget is less than this, trigger strict negotiation */
  LOW_THRESHOLD: 1.00,
  /** If remaining budget is less than this, basically broke */
  CRITICAL_THRESHOLD: 0.01,
};
