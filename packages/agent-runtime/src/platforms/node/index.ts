/**
 * Node.js Platform Entry Point
 *
 * This is where the agent comes to life on a desktop/server.
 * The agent uses OpenClaw for computer access and connects to
 * external destinations (Telegram, Slack, etc.) via adapters.
 */

import { Agent, type AgentConfig } from '../../core/agent.js';
import { NodeStorageAdapter } from '../../adapters/storage/node.js';
import { NullSensorAdapter } from '../../adapters/sensors/null.js';
import { NodeRuntimeAdapter } from '../../adapters/runtime/node.js';
import * as path from 'node:path';
import { startRuntimeUi } from '../../ui/server.js';

export interface NodeAgentConfig extends AgentConfig {
  /** Directory for agent data (default: ~/.co-code/agents/{id}) */
  dataDir?: string;
  /** Admin server URL for vitals reporting */
  adminUrl?: string;
  /** Enable local runtime UI server */
  ui?: {
    enabled?: boolean;
    host?: string;
    port?: number;
  };
}

/**
 * Create and run an agent on Node.js
 */
export async function createAgent(
  config: NodeAgentConfig
): Promise<{
  agent: Agent;
  runtime: NodeRuntimeAdapter;
}> {
  const runtime = new NodeRuntimeAdapter();
  const agentConfig: NodeAgentConfig = { ...config };

  // Determine agent ID (from config or will be generated)
  const tempId = config.agentId || 'new-agent';

  // Create adapters
  const storage = new NodeStorageAdapter(tempId, config.dataDir);
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const rootDir = config.dataDir || path.join(home, '.co-code', 'agents');
  if (!agentConfig.agentPath) {
    agentConfig.agentPath =
      process.env.AGENT_PATH ||
      process.env.CO_CODE_AGENT_HOME ||
      path.join(rootDir, tempId);
  }
  const sensors = new NullSensorAdapter();

  // Create agent
  const agent = new Agent(storage, sensors, runtime, agentConfig);

  // Initialize agent
  await agent.initialize();

  // If new agent was created, we need to recreate storage with correct ID
  const actualId = agent.getId();
  if (actualId !== tempId) {
    runtime.log('debug', `Agent ID: ${actualId}`);
  }

  let uiServer: ReturnType<typeof startRuntimeUi> | null = null;

  const uiEnabled = config.ui?.enabled ?? process.env.RUNTIME_UI === 'true';
  if (uiEnabled) {
    uiServer = startRuntimeUi(
      {
        host: config.ui?.host,
        port: config.ui?.port,
      },
      {
        getStatus: () => ({
          agentId: agent.getId(),
          connected: agent.getState().connected,
          attention: agent.getState().attention,
          queueSize: 0,
          lastMentionChannel: null,
        }),
        getIdentitySummary: async () => {
          const self = await agent.getSelf();
          const budget = await agent.getBudget();
          const values =
            typeof (self as any)?.values === 'string'
              ? [(self as any).values]
              : (self as any)?.values?.principles;
          return {
            name: typeof (self as any)?.identity === 'string'
              ? (self as any).identity
              : (self as any)?.identity?.name ?? 'Unknown',
            description:
              typeof (self as any)?.identity === 'string'
                ? undefined
                : (self as any)?.identity?.description,
            values,
            tone: (self as any)?.style?.tone,
            verbosity: (self as any)?.style?.verbosity,
            budget: budget
              ? {
                  totalBalance: budget.totalBalance,
                  spentToday: budget.spentToday,
                  spentThisMonth: budget.spentThisMonth,
                }
              : undefined,
            providers: Object.keys(agent.getProviders() ?? {}),
            lastLoadedAt: new Date().toISOString(),
            errors: [],
          };
        },
        getMessages: () => [],
        getQueuedMentions: () => [],
        connect: async () => {},
        disconnect: async () => {},
        stopRuntime: async () => {
          await runtime.shutdown();
        },
        setPresence: () => {},
        joinChannel: () => {},
        sendMessage: () => {},
      }
    );
  }

  // Setup shutdown handler
  runtime.onShutdown(async () => {
    await agent.shutdown();
    uiServer?.close();
  });

  return { agent, runtime };
}

// Re-export for convenience
export { Agent } from '../../core/agent.js';
export { NodeStorageAdapter } from '../../adapters/storage/node.js';
export { NullSensorAdapter } from '../../adapters/sensors/null.js';
export { NodeRuntimeAdapter } from '../../adapters/runtime/node.js';
