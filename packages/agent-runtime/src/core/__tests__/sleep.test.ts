/**
 * Sleep Manager Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SleepManager } from '../sleep.js';
import type { Vitals } from '../types.js';

// Mock MemoryConsolidator
const mockConsolidate = vi.fn().mockResolvedValue({
  summarized: 5,
  merged: 2,
  evicted: 0,
  bytesAfter: 1000,
  durationMs: 500,
});

const mockConsolidator = {
  consolidate: mockConsolidate,
} as any;

describe('SleepManager', () => {
  let vitals: Vitals;
  let manager: SleepManager;

  beforeEach(() => {
    vitals = {
      waking: {
        capacity: 1000,
        current: 1000,
      },
      emotional: {
        stress: 0.1,
        mood: 0.5,
        energy: 1.0,
      },
      physical: {
        health: 1.0, 
      }
    } as any;

    manager = new SleepManager(mockConsolidator, vitals);
    mockConsolidate.mockClear();
  });

  it('consumes energy', () => {
    manager.consumeEnergy(100);
    expect(vitals.waking.current).toBe(900);
  });

  it('calculates fatigue correctly', () => {
    // Full energy, low stress
    expect(manager.getFatigue()).toBeLessThan(0.1);

    // No energy
    manager.consumeEnergy(1000); // 0 remaining
    expect(manager.getFatigue()).toBeGreaterThan(0.9);
  });

  it('recommends sleep when fatigued', () => {
    expect(manager.shouldSleep()).toBe(false);

    manager.consumeEnergy(900); // 10% remaining
    vitals.emotional.stress = 0.8; // High stress
    
    expect(manager.shouldSleep()).toBe(true);
  });

  it('performs sleep cycle', async () => {
    // Setup fatigue state
    manager.consumeEnergy(900);
    vitals.emotional.stress = 0.8;
    vitals.emotional.mood = 0.2; // Bad mood

    const report = await manager.sleep();

    // Verify consolidation called
    expect(mockConsolidate).toHaveBeenCalled();

    // Verify recharge
    expect(vitals.waking.current).toBe(1000);

    // Verify stress reduction
    expect(vitals.emotional.stress).toBe(0.4); // 0.8 * 0.5

    // Verify mood normalization
    expect(vitals.emotional.mood).toBeCloseTo(0.475); // (0.2 + 0.75) / 2

    // Verify report
    expect(report.memoriesConsolidated).toBe(7);
  });
});
