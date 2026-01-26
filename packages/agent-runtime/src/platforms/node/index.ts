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

export interface NodeAgentConfig extends AgentConfig {
  /** Directory for agent data (default: ~/.co-code/agents/{id}) */
  dataDir?: string;
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

  // Determine agent ID (from config or will be generated)
  const tempId = config.agentId || 'new-agent';

  // Create adapters
  const storage = new NodeStorageAdapter(tempId, config.dataDir);
  const sensors = new NullSensorAdapter();

  // Create agent
  const agent = new Agent(storage, sensors, runtime, config);

  // Initialize agent
  await agent.initialize();

  // If new agent was created, we need to recreate storage with correct ID
  const actualId = agent.getId();
  if (actualId !== tempId) {
    // Migrate to correct location (for new agents)
    runtime.log('debug', `Agent ID: ${actualId}`);
  }

  // Connect to collective if URL provided
  let connection: CollectiveConnection | null = null;
  const mentionQueue: Message[] = [];
  let handlingMention = false;
  let lastMentionChannel: string | null = null;

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
      updateAttention(message.channelId, 'active');
      const response = await agent.handleMessage(
        message.channelId,
        message.senderId,
        message.content
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

  if (config.collectiveUrl) {
    // Get token from config file
    const configData = await storage.read('identity/config');
    if (!configData) {
      runtime.log(
        'warn',
        'No config file found. Run with --setup to configure connection.'
      );
    } else {
      const parsed = JSON.parse(configData);
      if (parsed.token) {
        connection = new CollectiveConnection(
          {
            url: config.collectiveUrl,
            token: parsed.token,
          },
          {
            onConnected: () => {
              runtime.log('info', 'Connected to collective');
              agent.setConnected(true);
            },
            onDisconnected: () => {
              runtime.log('info', 'Disconnected from collective');
              agent.setConnected(false);
            },
            onMessage: async (message: Message) => {
              runtime.log('debug', 'Received message', message);
              // Handle message
              const response = await agent.handleMessage(
                message.channelId,
                message.senderId,
                message.content
              );
              // Send response
              if (connection && response) {
                connection.sendMessage(message.channelId, { text: response });
              }
            },
            onMention: async (event) => {
              const message = event.message;
              if (handlingMention) {
                mentionQueue.push(message);
                updateAttention(message.channelId, 'queued');
                return;
              }
              mentionQueue.push(message);
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

  // Setup shutdown handler
  runtime.onShutdown(async () => {
    await agent.shutdown();
    connection?.disconnect();
  });

  return { agent, connection, runtime };
}

// Re-export for convenience
export { Agent } from '../../core/agent.js';
export { NodeStorageAdapter } from '../../adapters/storage/node.js';
export { NullSensorAdapter } from '../../adapters/sensors/null.js';
export { NodeRuntimeAdapter } from '../../adapters/runtime/node.js';
export { CollectiveConnection } from '../../connections/collective.js';
