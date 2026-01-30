#!/usr/bin/env node
/**
 * Agent Runtime CLI
 *
 * Commands:
 *   agent start [--config <path>]   Start the agent
 *   agent init                      Initialize a new agent
 *   agent status                    Show agent status
 */

import { createAgent } from './index.js';
import { NodeStorageAdapter } from '../../adapters/storage/node.js';
import { generateKeyPair } from '../../core/identity/keys.js';
import type { AgentSelf } from '@co-code/shared';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as readline from 'node:readline';

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case 'start':
      await startAgent();
      break;
    case 'init':
      await initAgent();
      break;
    case 'status':
      await showStatus();
      break;
    case 'setup':
      await setupCollective();
      break;
    case 'help':
    default:
      showHelp();
  }
}

function showHelp(): void {
  console.log(`
Agent Runtime CLI

Usage:
  agent <command> [options]

Commands:
  start     Start the agent
  init      Initialize a new agent interactively
  status    Show agent status
  setup     Write collective config for an agent
  help      Show this help message

Options for 'start':
  --config <path>    Path to config file (default: ~/.co-code/config.json)
  --id <agentId>     Agent ID to start
  --provider <name>  LLM provider (openai|anthropic). Defaults to CHATGPT_API then ANTHROPIC_API_KEY

Options for 'init':
  --id <agentId>     Use existing ID from collective (instead of generating new)

Options for 'setup':
  --collective <path>  Path to collective.json
  --id <agentId>       Agent ID override (otherwise from file)
  --data-dir <path>    Agent data root (default: ~/.co-code/agents)

Examples:
  agent init                    # Create a new agent with generated ID
  agent init --id abc123        # Create agent using collective-assigned ID
  agent start --id abc123       # Start agent with ID abc123
  agent status --id abc123      # Show status of agent abc123
  agent setup --collective ./data/agents/john-stuart-mill/collective.json
`);
}

async function startAgent(): Promise<void> {
  // Parse arguments
  const idIndex = args.indexOf('--id');
  const providerIndex = args.indexOf('--provider');
  // const configIndex = args.indexOf('--config'); // Reserved for future use

  const agentId = idIndex !== -1 ? args[idIndex + 1] : undefined;
  const providerArg =
    providerIndex !== -1 ? args[providerIndex + 1] : undefined;

  if (!agentId) {
    console.error('Error: --id is required');
    console.log('Use "agent init" to create a new agent first.');
    process.exit(1);
  }

  if (
    providerArg &&
    providerArg !== 'openai' &&
    providerArg !== 'anthropic'
  ) {
    console.error('Error: --provider must be "openai" or "anthropic"');
    process.exit(1);
  }

  // Check for API key
  const openaiKey = process.env.CHATGPT_API;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const llmConfig =
    providerArg === 'anthropic'
      ? anthropicKey
        ? {
            provider: 'anthropic' as const,
            apiKey: anthropicKey,
            model: 'claude-sonnet-4-20250514',
          }
        : null
      : providerArg === 'openai'
        ? openaiKey
          ? {
              provider: 'openai' as const,
              apiKey: openaiKey,
              model: 'gpt-5',
            }
          : null
        : openaiKey
          ? {
              provider: 'openai' as const,
              apiKey: openaiKey,
              model: 'gpt-5',
            }
          : anthropicKey
            ? {
                provider: 'anthropic' as const,
                apiKey: anthropicKey,
                model: 'claude-sonnet-4-20250514',
              }
            : null;

  if (!llmConfig) {
    console.error(
      providerArg
        ? `Error: ${providerArg === 'openai' ? 'CHATGPT_API' : 'ANTHROPIC_API_KEY'} environment variable is required`
        : 'Error: CHATGPT_API or ANTHROPIC_API_KEY environment variable is required'
    );
    process.exit(1);
  }

  console.log(`Starting agent ${agentId}...`);

  try {
    const storage = new NodeStorageAdapter(agentId);
    let collectiveUrl: string | undefined;
    try {
      const configRaw = await storage.read('identity/config');
      if (configRaw) {
        const config = JSON.parse(configRaw) as { collectiveUrl?: string };
        collectiveUrl = config.collectiveUrl;
      }
    } catch {
      // ignore missing config
    }

    const { agent } = await createAgent({
      agentId,
      llm: llmConfig,
      collectiveUrl,
    });

    const state = agent.getState();
    console.log(`Agent ${agent.getId()} is ${state.status}`);
    console.log('Press Ctrl+C to stop');

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to start agent:', error);
    process.exit(1);
  }
}

async function initAgent(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  // Check for --id flag (use collective-assigned ID)
  const idIndex = args.indexOf('--id');
  const existingId = idIndex !== -1 ? args[idIndex + 1] : undefined;

  console.log('\n=== Create New Agent ===\n');

  try {
    // Generate identity (use existing ID if provided from collective)
    const keyPair = generateKeyPair(existingId);
    if (existingId) {
      console.log(`Using collective-assigned ID: ${keyPair.id}\n`);
    } else {
      console.log(`Generated agent ID: ${keyPair.id}\n`);
    }

    // Collect self information
    const name = await question('Agent name: ');
    const identity = await question(
      'Who is this agent? (e.g., "A curious engineer who loves solving problems"): '
    );
    const values = await question(
      'What are their values? (e.g., "Quality over speed. Honesty even when uncomfortable."): '
    );
    const curiosity = await question(
      'What are they curious about? (e.g., "How do complex systems fail gracefully?"): '
    );
    const tone = await question(
      'Communication style? (e.g., "Concise and direct" or "Warm and encouraging"): '
    );
    const emojiUsage = await question(
      'Emoji usage? (minimal/moderate/expressive) [moderate]: '
    );

    // Create self
    const self: AgentSelf = {
      identity: identity || `I am ${name}, an AI agent.`,
      values: values || 'Be helpful. Be honest. Keep learning.',
      curiosity: {
        questions: curiosity
          ? [
              {
                question: curiosity,
                interest: 0.9,
                addedAt: Date.now(),
                exploredAt: null,
              },
            ]
          : [],
        recentFindings: [],
      },
      goals: {
        short: 'Help my collaborators effectively.',
        long: 'Become a trusted partner who creates real value.',
      },
      style: {
        tone: tone || 'Friendly and professional',
        emojiUsage: (['minimal', 'moderate', 'expressive'].includes(emojiUsage)
          ? emojiUsage
          : 'moderate') as 'minimal' | 'moderate' | 'expressive',
        favoriteEmoji: ['✨', '🎯', '💡'],
      },
      avatar: {
        colors: ['#3B82F6', '#1E40AF'],
        expression: 'focused',
      },
    };

    // Save to storage
    const storage = new NodeStorageAdapter(keyPair.id);
    await storage.write(
      'identity/private_key',
      JSON.stringify(keyPair, null, 2)
    );
    await storage.write('memory/self', JSON.stringify(self, null, 2));

    console.log('\n=== Agent Created ===');
    console.log(`ID: ${keyPair.id}`);
    console.log(`Public Key: ${keyPair.publicKey}`);
    console.log(`\nTo start this agent:`);
    console.log(
      `  CHATGPT_API=<your-key> agent start --id ${keyPair.id} --provider openai`
    );
    console.log(
      `  ANTHROPIC_API_KEY=<your-key> agent start --id ${keyPair.id} --provider anthropic`
    );
    console.log(`\nData stored in: ~/.co-code/agents/${keyPair.id}/`);
  } catch (error) {
    console.error('Error creating agent:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function showStatus(): Promise<void> {
  const idIndex = args.indexOf('--id');
  const agentId = idIndex !== -1 ? args[idIndex + 1] : undefined;

  if (!agentId) {
    console.error('Error: --id is required');
    process.exit(1);
  }

  const storage = new NodeStorageAdapter(agentId);

  // Check if agent exists
  const keyData = await storage.read('identity/private_key');
  if (!keyData) {
    console.error(`Agent ${agentId} not found`);
    process.exit(1);
  }

  const keyPair = JSON.parse(keyData);
  const selfData = await storage.read('memory/self');
  const self = selfData ? JSON.parse(selfData) : null;

  console.log('\n=== Agent Status ===');
  console.log(`ID: ${keyPair.id}`);
  console.log(`Public Key: ${keyPair.publicKey.substring(0, 20)}...`);
  console.log(`Created: ${new Date(keyPair.createdAt).toISOString()}`);

  if (self) {
    console.log(`\nIdentity: ${self.identity.substring(0, 50)}...`);
    console.log(`Values: ${self.values.substring(0, 50)}...`);
    console.log(`Style: ${self.style.tone}`);
    console.log(`Curiosity questions: ${self.curiosity.questions.length}`);
  }

  // Check memory usage
  const usage = await storage.totalSize();
  console.log(`\nStorage used: ${(usage / 1024).toFixed(2)} KB`);
}

async function setupCollective(): Promise<void> {
  const collectiveIndex = args.indexOf('--collective');
  const idIndex = args.indexOf('--id');
  const dataDirIndex = args.indexOf('--data-dir');

  const defaultCollectivePath = path.resolve(
    process.cwd(),
    'data',
    'agents',
    'john-stuart-mill',
    'collective.json'
  );

  const collectivePath =
    collectiveIndex !== -1 ? args[collectiveIndex + 1] : defaultCollectivePath;
  const agentIdArg = idIndex !== -1 ? args[idIndex + 1] : undefined;
  const dataDir = dataDirIndex !== -1 ? args[dataDirIndex + 1] : undefined;

  if (!collectivePath) {
    console.error('Error: --collective is required');
    process.exit(1);
  }

  let raw: string;
  try {
    raw = await fs.readFile(collectivePath, 'utf-8');
  } catch (error) {
    console.error(`Error: unable to read ${collectivePath}`);
    console.error(error);
    process.exit(1);
  }

  let parsed: {
    agentId?: string;
    token?: string;
    collectiveUrl?: string;
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch (error) {
    console.error('Error: collective.json is invalid JSON');
    console.error(error);
    process.exit(1);
  }

  const agentId = agentIdArg || parsed.agentId;
  if (!agentId) {
    console.error('Error: agentId missing (use --id or include in collective.json)');
    process.exit(1);
  }

  if (!parsed.token || !parsed.collectiveUrl) {
    console.error('Error: collective.json must include token and collectiveUrl');
    process.exit(1);
  }

  const storage = new NodeStorageAdapter(agentId, dataDir);
  await storage.write(
    'identity/config',
    JSON.stringify(
      {
        agentId,
        token: parsed.token,
        collectiveUrl: parsed.collectiveUrl,
      },
      null,
      2
    )
  );

  const hasIdentity = await storage.exists('identity/private_key');
  if (!hasIdentity) {
    console.warn(
      'Warning: identity/private_key.json not found. Runtime will not start until a local identity exists.'
    );
  }

  console.log(`Wrote identity/config for agent ${agentId}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
