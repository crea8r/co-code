import { describe, expect, it } from 'vitest';
import { computeStress } from '../vitals/stress.js';
import { DEFAULT_SELF, DEFAULT_VITALS } from '../../identity/defaults.js';


describe('computeStress', () => {
  it('increases stress with unresolved curiosity and low mood', () => {
    const self = {
      ...DEFAULT_SELF,
      curiosity: {
        ...DEFAULT_SELF.curiosity,
        questions: [
          {
            id: 'q1',
            text: 'Why?',
            priority: 'high' as const,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };

    const vitals = {
      ...DEFAULT_VITALS,
      emotional: {
        ...DEFAULT_VITALS.emotional,
        mood: 0.2,
        curiositySatisfaction: 0.1,
        stress: 0.2,
      },
    };

    const stress = computeStress(self, vitals);
    expect(stress).toBeGreaterThan(0.2);
  });
});
