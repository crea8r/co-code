import { describe, expect, it } from 'vitest';
import { SleepManager } from '../sleep.js';
import type { Vitals } from '../../identity/types.js';

const createVitals = (current: number, capacity: number): Vitals => ({
  waking: {
    capacity,
    current,
    thresholdWarn: 0.7,
    thresholdCritical: 0.9,
    lastSleep: new Date().toISOString(),
    lastWake: new Date().toISOString(),
  },
  emotional: {
    stress: 0.2,
    mood: 0.7,
    joy: 0.5,
    curiositySatisfaction: 0.5,
  },
});

describe('SleepManager thresholds', () => {
  it('warns when usage ratio crosses threshold', () => {
    const vitals = createVitals(30, 100); // 70% used
    const manager = new SleepManager({ consolidate: async () => ({ summarized: 0, merged: 0 }) } as any, vitals);
    expect(manager.shouldWarn()).toBe(true);
  });

  it('marks critical when usage ratio crosses critical threshold', () => {
    const vitals = createVitals(10, 100); // 90% used
    const manager = new SleepManager({ consolidate: async () => ({ summarized: 0, merged: 0 }) } as any, vitals);
    expect(manager.shouldCritical()).toBe(true);
  });
});
