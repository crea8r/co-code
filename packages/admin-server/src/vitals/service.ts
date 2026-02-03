import { query, queryOne } from '../db/client.js';

type CycleInput = {
  wakeAt: string;
  sleepAt: string;
  beforeSleep: Record<string, unknown>;
  afterSleep: Record<string, unknown>;
  modelsUsed: Record<string, number>;
  budget: Record<string, number>;
};

export type VitalsCycle = {
  id: string;
  agentId: string;
  wakeAt: string;
  sleepAt: string;
  beforeSleep: Record<string, unknown>;
  afterSleep: Record<string, unknown>;
  modelsUsed: Record<string, number>;
  budget: Record<string, number>;
  createdAt: string;
};

export type VitalsCurrent = {
  agentId: string;
  state: Record<string, unknown>;
  updatedAt: string;
};

export async function insertCycle(agentId: string, input: CycleInput): Promise<VitalsCycle> {
  const [row] = await query<VitalsCycle>(
    `INSERT INTO agent_vitals_cycles (agent_id, wake_at, sleep_at, before_sleep, after_sleep, models_used, budget)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, agent_id as "agentId", wake_at as "wakeAt", sleep_at as "sleepAt",
               before_sleep as "beforeSleep", after_sleep as "afterSleep",
               models_used as "modelsUsed", budget, created_at as "createdAt"`,
    [
      agentId,
      input.wakeAt,
      input.sleepAt,
      JSON.stringify(input.beforeSleep),
      JSON.stringify(input.afterSleep),
      JSON.stringify(input.modelsUsed),
      JSON.stringify(input.budget),
    ]
  );

  return row;
}

export async function listCycles(agentId: string, limit: number): Promise<VitalsCycle[]> {
  return query<VitalsCycle>(
    `SELECT id, agent_id as "agentId", wake_at as "wakeAt", sleep_at as "sleepAt",
            before_sleep as "beforeSleep", after_sleep as "afterSleep",
            models_used as "modelsUsed", budget, created_at as "createdAt"
     FROM agent_vitals_cycles
     WHERE agent_id = $1
     ORDER BY sleep_at DESC
     LIMIT $2`,
    [agentId, limit]
  );
}

export async function upsertCurrent(
  agentId: string,
  state: Record<string, unknown>
): Promise<VitalsCurrent> {
  const [row] = await query<VitalsCurrent>(
    `INSERT INTO agent_vitals_current (agent_id, state)
     VALUES ($1, $2)
     ON CONFLICT (agent_id)
     DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
     RETURNING agent_id as "agentId", state, updated_at as "updatedAt"`,
    [agentId, JSON.stringify(state)]
  );

  return row;
}

export async function getCurrent(agentId: string): Promise<VitalsCurrent | null> {
  return queryOne<VitalsCurrent>(
    `SELECT agent_id as "agentId", state, updated_at as "updatedAt"
     FROM agent_vitals_current WHERE agent_id = $1`,
    [agentId]
  );
}
