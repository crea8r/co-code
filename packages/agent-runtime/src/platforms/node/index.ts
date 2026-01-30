/**
 * Node.js Platform Entry Point
 *
 * This is where the agent comes to life on a desktop/server.
 */

import { Agent, type AgentConfig } from '../../core/agent.js';
import { NodeStorageAdapter } from '../../adapters/storage/node.js';
import { NullSensorAdapter } from '../../adapters/sensors/null.js';
import { NodeRuntimeAdapter } from '../../adapters/runtime/node.js';
import { CollectiveConnection } from '../../connections/collective.js';
import type { Message, AttentionState } from '@co-code/shared';
import * as path from 'node:path';
import { startRuntimeUi } from '../../ui/server.js';

export interface NodeAgentConfig extends AgentConfig {
  /** Directory for agent data (default: ~/.co-code/agents/{id}) */
  dataDir?: string;
  /** Default channel ID to auto-join on connect */
  defaultChannelId?: string;
  /** Default channel IDs to auto-join on connect */
  defaultChannelIds?: string[];
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
  connection: CollectiveConnection | null;
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

  // Prepare sleep warning hook (uses connection once available)
  let connection: CollectiveConnection | null = null;
  agentConfig.onSleepWarning = (level) => {
    if (!connection) return;
    const status = level === 'critical' ? 'sleeping' : 'away';
    connection.setStatus(status);
    if (lastMentionChannel) {
      const notice =
        level === 'critical'
          ? 'Need to rest now. Will be back after consolidating memories.'
          : 'Approaching sleep threshold. Wrapping up current work.';
      connection.sendMessage(lastMentionChannel, { text: notice });
    }
  };

  // Create agent
  const agent = new Agent(storage, sensors, runtime, agentConfig);

  // Initialize agent
  await agent.initialize();

  // If new agent was created, we need to recreate storage with correct ID
  const actualId = agent.getId();
  if (actualId !== tempId) {
    // Migrate to correct location (for new agents)
    runtime.log('debug', `Agent ID: ${actualId}`);
  }

  // Connect to collective if URL provided
  const mentionQueue: Message[] = [];
  const mentionQueueMeta: Array<{
    message: Message;
    enqueuedAt: number;
    priority: 'high' | 'normal';
  }> = [];
  let handlingMention = false;
  let lastMentionChannel: string | null = null;
  const mentionDedupe = new Map<string, number>();
  const mentionDedupeTtlMs = 5 * 60 * 1000;
  const messageHistory = new Map<string, Message[]>();
  const maxHistory = 20;

  const updateAttention = (
    channelId: string,
    state: AttentionState
  ): void => {
    agent.setAttentionState(state);
    lastMentionChannel = channelId;
    connection?.setAttention(channelId, state, mentionQueue.length);
  };

  const processMentionQueue = async (): Promise<void> => {
    if (handlingMention) return;
    handlingMention = true;
    while (mentionQueue.length > 0) {
      const message = mentionQueue.shift();
      if (!message) continue;
      const metaIndex = mentionQueueMeta.findIndex((entry) => entry.message.id === message.id);
      if (metaIndex >= 0) mentionQueueMeta.splice(metaIndex, 1);
      updateAttention(message.channelId, 'active');
      const contextText = buildContextText(message);
      const response = await agent.handleMessage(
        message.channelId,
        message.senderId,
        { ...message.content, text: contextText }
      );
      if (connection && response) {
        connection.sendMessage(message.channelId, { text: response });
      }
    }
    handlingMention = false;
    if (lastMentionChannel) {
      updateAttention(lastMentionChannel, 'idle');
    }
  };

  const shouldSkipMention = (message: Message): boolean => {
    if (!message.id) return false;
    const now = Date.now();
    for (const [id, timestamp] of mentionDedupe.entries()) {
      if (now - timestamp > mentionDedupeTtlMs) {
        mentionDedupe.delete(id);
      }
    }
    if (mentionDedupe.has(message.id)) {
      return true;
    }
    mentionDedupe.set(message.id, now);
    if (mentionDedupe.size > 1000) {
      const oldest = [...mentionDedupe.entries()].sort((a, b) => a[1] - b[1])[0];
      if (oldest) mentionDedupe.delete(oldest[0]);
    }
    return false;
  };

  const recordMessage = (message: Message): void => {
    const list = messageHistory.get(message.channelId) ?? [];
    list.push(message);
    if (list.length > maxHistory) {
      list.splice(0, list.length - maxHistory);
    }
    messageHistory.set(message.channelId, list);
  };

  const buildContextText = (message: Message): string => {
    const history = messageHistory.get(message.channelId) ?? [];
    const contextMessages = history
      .filter((item) => item.id !== message.id)
      .slice(-10);
    const lines = contextMessages
      .map((item) => {
        const text = item.content.text ?? '';
        if (!text) return null;
        return `- [${item.senderType}:${item.senderId}] ${text}`;
      })
      .filter((line): line is string => Boolean(line));

    const mentionText = message.content.text ?? '';
    if (!lines.length) return mentionText;
    return `Recent messages:\n${lines.join('\n')}\n\nMention:\n${mentionText}`;
  };

  let uiServer: ReturnType<typeof startRuntimeUi> | null = null;

  const resolveDefaultChannels = (
    parsedConfig: Record<string, unknown> | null
  ): string[] => {
    const candidates: Array<unknown> = [
      agentConfig.defaultChannelIds,
      agentConfig.defaultChannelId,
      parsedConfig?.defaultChannelIds,
      parsedConfig?.defaultChannelId,
      parsedConfig?.channelId,
      process.env.COLLECTIVE_DEFAULT_CHANNELS,
      process.env.COLLECTIVE_DEFAULT_CHANNEL,
    ];

    const channelIds: string[] = [];
    for (const value of candidates) {
      if (!value) continue;
      if (Array.isArray(value)) {
        channelIds.push(
          ...value.filter((item): item is string => typeof item === 'string')
        );
      } else if (typeof value === 'string') {
        const split = value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);
        channelIds.push(...split);
      }
    }

    return Array.from(new Set(channelIds));
  };

  {
    // Load collective config (token + URL)
    const configData = await storage.read('identity/config');
    if (!configData) {
      if (config.collectiveUrl) {
        runtime.log(
          'warn',
          'No config file found. Run with --setup to configure connection.'
        );
      }
    } else {
      const parsed = JSON.parse(configData);
      const collectiveUrl = config.collectiveUrl || parsed.collectiveUrl;
      const defaultChannels = resolveDefaultChannels(parsed);
      if (parsed.token && collectiveUrl) {
        connection = new CollectiveConnection(
          {
            url: collectiveUrl,
            token: parsed.token,
          },
          {
            onConnected: () => {
              runtime.log('info', 'Connected to collective');
              agent.setConnected(true);
              if (defaultChannels.length > 0) {
                for (const channelId of defaultChannels) {
                  try {
                    connection?.joinChannel(channelId);
                  } catch (error) {
                    runtime.log(
                      'warn',
                      `Failed to join channel ${channelId}`,
                      error
                    );
                  }
                }
              }
            },
            onDisconnected: () => {
              runtime.log('info', 'Disconnected from collective');
              agent.setConnected(false);
            },
            onMessage: async (message: Message) => {
              runtime.log('debug', 'Received message', message);
              recordMessage(message);
              // Mention-driven only; non-mentions are not processed.
            },
            onMention: async (event) => {
              const message = event.message;
              recordMessage(message);
              if (event.mentionedEntityId !== agent.getId()) {
                return;
              }
              if (shouldSkipMention(message)) {
                runtime.log('debug', 'Skipping duplicate mention', message.id);
                return;
              }
              if (handlingMention) {
                mentionQueue.push(message);
                mentionQueueMeta.push({
                  message,
                  enqueuedAt: Date.now(),
                  priority: 'high',
                });
                updateAttention(message.channelId, 'queued');
                return;
              }
              mentionQueue.push(message);
              mentionQueueMeta.push({
                message,
                enqueuedAt: Date.now(),
                priority: 'high',
              });
              await processMentionQueue();
            },
            onError: (error) => {
              runtime.log('error', 'Connection error', error);
            },
          }
        );

        try {
          await connection.connect();
        } catch (error) {
          runtime.log('error', 'Failed to connect to collective', error);
        }
      }
    }
  }

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
          queueSize: mentionQueue.length,
          lastMentionChannel,
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
        getMessages: (channelId?: string) => {
          if (!channelId) {
            return Array.from(messageHistory.values()).flat();
          }
          return messageHistory.get(channelId) ?? [];
        },
        getQueuedMentions: () => mentionQueueMeta,
        connect: async () => {
          if (!connection) return;
          await connection.connect();
        },
        disconnect: async () => {
          connection?.disconnect();
        },
        stopRuntime: async () => {
          await runtime.shutdown();
        },
        setPresence: (status: string) => {
          connection?.setStatus(status as any);
        },
        joinChannel: (channelId: string) => {
          connection?.joinChannel(channelId);
        },
        sendMessage: (channelId: string, text: string) => {
          connection?.sendMessage(channelId, { text });
        },
      }
    );
  }

  // Setup shutdown handler
  runtime.onShutdown(async () => {
    await agent.shutdown();
    connection?.disconnect();
    uiServer?.close();
  });

  return { agent, connection, runtime };
}

// Re-export for convenience
export { Agent } from '../../core/agent.js';
export { NodeStorageAdapter } from '../../adapters/storage/node.js';
export { NullSensorAdapter } from '../../adapters/sensors/null.js';
export { NodeRuntimeAdapter } from '../../adapters/runtime/node.js';
export { CollectiveConnection } from '../../connections/collective.js';
