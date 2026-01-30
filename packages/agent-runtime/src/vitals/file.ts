import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Vitals, Budget } from '../identity/types.js';
import type { VitalsCycle } from './index.js';

export async function saveVitalsYaml(agentPath: string, vitals: Vitals): Promise<void> {
  const vitalsPath = path.join(agentPath, 'vitals.yaml');
  const payload = {
    waking: {
      capacity: vitals.waking.capacity,
      current: vitals.waking.current,
      threshold_warn: vitals.waking.thresholdWarn,
      threshold_critical: vitals.waking.thresholdCritical,
      last_sleep: vitals.waking.lastSleep,
      last_wake: vitals.waking.lastWake,
    },
    emotional: {
      stress: vitals.emotional.stress,
      mood: vitals.emotional.mood,
      joy: vitals.emotional.joy,
      curiosity_satisfaction: vitals.emotional.curiositySatisfaction,
    },
  };
  await fs.writeFile(vitalsPath, stringifyYaml(payload), 'utf8');
}

export async function appendVitalsHistoryYaml(
  agentPath: string,
  cycle: VitalsCycle
): Promise<void> {
  const historyPath = path.join(agentPath, 'vitals', 'history.yaml');
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  let history: VitalsCycle[] = [];
  try {
    const raw = await fs.readFile(historyPath, 'utf8');
    const parsed = parseYaml(raw) as VitalsCycle[] | undefined;
    history = Array.isArray(parsed) ? parsed : [];
  } catch {
    history = [];
  }

  history.unshift(cycle);
  const trimmed = history.slice(0, 200);
  await fs.writeFile(historyPath, stringifyYaml(trimmed), 'utf8');
}

export function buildVitalsCycle(
  before: Vitals,
  after: Vitals,
  modelUsage: Record<string, number>,
  budget: Budget
): VitalsCycle {
  return {
    wake: before.waking.lastWake,
    sleep: after.waking.lastSleep,
    before_sleep: {
      stress: before.emotional.stress,
      mood: before.emotional.mood,
      joy: before.emotional.joy,
      curiosity_satisfaction: before.emotional.curiositySatisfaction,
    },
    after_sleep: {
      stress: after.emotional.stress,
      mood: after.emotional.mood,
      joy: after.emotional.joy,
      curiosity_satisfaction: after.emotional.curiositySatisfaction,
    },
    models_used: { ...modelUsage },
    budget: {
      spent_today: budget.spentToday,
      spent_this_month: budget.spentThisMonth,
      total_balance: budget.totalBalance,
    },
  };
}
