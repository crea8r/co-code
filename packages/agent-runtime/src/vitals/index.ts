import type { MemoryStore } from '../core/memory/store.js';
import type { Vitals } from '../identity/types.js';
export * from './file.js';

export type VitalsCycle = {
  wake: string;
  sleep: string;
  before_sleep: Record<string, number>;
  after_sleep: Record<string, number>;
  models_used: Record<string, number>;
  budget: Record<string, number>;
};

export type VitalsSnapshot = {
  current: Vitals;
  cycles: VitalsCycle[];
};

const VITALS_HISTORY_KEY = 'vitals/history';

export async function recordCycle(
  store: MemoryStore,
  cycle: VitalsCycle
): Promise<void> {
  const history = await loadHistory(store);
  history.unshift(cycle);
  await store.storage.write(VITALS_HISTORY_KEY, JSON.stringify(history.slice(0, 200), null, 2));
}

export async function loadHistory(store: MemoryStore): Promise<VitalsCycle[]> {
  const data = await store.storage.read(VITALS_HISTORY_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data) as VitalsCycle[];
  } catch {
    return [];
  }
}

export async function snapshot(store: MemoryStore): Promise<VitalsSnapshot> {
  const current = await store.getVitals();
  const cycles = await loadHistory(store);
  return { current, cycles };
}
