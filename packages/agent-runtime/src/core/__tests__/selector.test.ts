/**
 * Model Selector Tests
 * 
 * Verifies the "Nature Dominant" (60%) selection architectural decision.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ModelSelector } from '../llm/selector.js';
import type { Model } from '../llm/provider.js';
import {
  DEFAULT_SELF,
  DEFAULT_VITALS,
  DEFAULT_BUDGET,
  generateBirthTraits,
} from '../../identity/defaults.js';
import type { AgentLoadedState } from '../../identity/types.js';

describe('ModelSelector', () => {
  let selector: ModelSelector;
  let mockState: AgentLoadedState;
  
  const models: Model[] = [
    {
      id: 'claude-opus',
      name: 'Claude Opus',
      provider: 'anthropic',
      tier: 'expensive',
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.075,
      maxContext: 200000,
      strengths: ['reasoning', 'nuance'],
    },
    {
      id: 'claude-sonnet',
      name: 'Claude Sonnet',
      provider: 'anthropic',
      tier: 'standard',
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
      maxContext: 200000,
      strengths: ['coding', 'balanced'],
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      tier: 'cheap',
      inputCostPer1k: 0.00015,
      outputCostPer1k: 0.0006,
      maxContext: 128000,
      strengths: ['speed'],
    },
  ];

  beforeEach(() => {
    mockState = {
      agentPath: '/mock',
      soul: {
        birthTraits: generateBirthTraits(),
        integritySignature: '',
      },
      self: DEFAULT_SELF,
      vitals: DEFAULT_VITALS,
      // Healthy budget to prioritize Nature over Nurture in standard tests
      budget: { ...DEFAULT_BUDGET, totalBalance: 100, spentThisMonth: 0 },
      providers: {},
      relationships: { humans: [], agents: [] },
      recentExperiences: [],
      memorySummaries: [],
    };
    
    selector = new ModelSelector(mockState, models);
  });

  it('selects sophisticated models for curious agents even if task is medium', () => {
    // Set high curiosity trait (Nature 60%)
    mockState.soul.birthTraits.selfInfluence['curiosity'] = 0.9;
    
    // Use medium task - usually Sonnet
    // But high curiosity should boost Opus (reasoning)
    const result = selector.selectModel('medium', 'Investigate weird bug');

    // Opus (expensive/reasoning) should win or be top chain due to Nature boost
    expect(result.primary).toBe('claude-opus');
    expect(result.reason).toContain('Nature');
  });

  it('downgrades to cheap models when budget is critical', () => {
    // Simulate critical budget
    mockState.budget.totalBalance = 100;
    mockState.budget.spentThisMonth = 99.995; // Only 0.005 left
    
    const result = selector.selectModel('medium', 'Write code');

    // Should only have cheap models
    expect(result.primary).toBe('gpt-4o-mini');
    // Reason will be budget related or just score
  });

  it('prefers speed/cheap models for impatient agents', () => {
    // Set low patience (prefers speed) and low curiosity
    mockState.soul.birthTraits.selfInfluence['patience'] = 0.1;
    mockState.soul.birthTraits.selfInfluence['curiosity'] = 0.2;
    
    const result = selector.selectModel('medium', 'Quick check');
    
    // Should prefer Sonnet or Mini, definitely not Opus
    expect(result.primary).not.toBe('claude-opus');
  });

  it('is deterministic for same inputs (Entropy)', () => {
    const run1 = selector.selectModel('medium', 'Same task');
    
    // Changed mood = changed entropy
    mockState.vitals.emotional.mood = 0.1;
    
    // Reset state for deterministic check
    mockState.vitals.emotional.mood = 0.7; // Default
    const run1Again = selector.selectModel('medium', 'Same task');
    
    expect(run1.primary).toBe(run1Again.primary);
  });
});
