import { query, queryOne } from '../db/client.js';

export type DestinationConfig = {
  id: string;
  agentId: string;
  destination: string;
  policy: Record<string, unknown>;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export async function listDestinationConfigs(agentId: string): Promise<DestinationConfig[]> {
  return query<DestinationConfig>(
    `SELECT id, agent_id as "agentId", destination, policy, config,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM destination_configs WHERE agent_id = $1
     ORDER BY destination ASC`,
    [agentId]
  );
}

export async function upsertDestinationConfig(
  agentId: string,
  destination: string,
  policy: Record<string, unknown>,
  config: Record<string, unknown>
): Promise<DestinationConfig> {
  const [row] = await query<DestinationConfig>(
    `INSERT INTO destination_configs (agent_id, destination, policy, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (agent_id, destination)
     DO UPDATE SET policy = EXCLUDED.policy, config = EXCLUDED.config, updated_at = NOW()
     RETURNING id, agent_id as "agentId", destination, policy, config,
               created_at as "createdAt", updated_at as "updatedAt"`,
    [agentId, destination, JSON.stringify(policy), JSON.stringify(config)]
  );

  return row;
}

export async function getDestinationConfig(
  agentId: string,
  destination: string
): Promise<DestinationConfig | null> {
  return queryOne<DestinationConfig>(
    `SELECT id, agent_id as "agentId", destination, policy, config,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM destination_configs WHERE agent_id = $1 AND destination = $2`,
    [agentId, destination]
  );
}
