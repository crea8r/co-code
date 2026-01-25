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
  help      Show this help message

Options for 'start':
  --config <path>   Path to config file (default: ~/.co-code/config.json)
  --id <agentId>    Agent ID to start

Examples:
  agent init                    # Create a new agent
  agent start --id abc123       # Start agent with ID abc123
  agent status --id abc123      # Show status of agent abc123
`);
}

async function startAgent(): Promise<void> {
  // Parse arguments
  const idIndex = args.indexOf('--id');
  // const configIndex = args.indexOf('--config'); // Reserved for future use

  const agentId = idIndex !== -1 ? args[idIndex + 1] : undefined;

  if (!agentId) {
    console.error('Error: --id is required');
    console.log('Use "agent init" to create a new agent first.');
    process.exit(1);
  }

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log(`Starting agent ${agentId}...`);

  try {
    const { agent } = await createAgent({
      agentId,
      llm: {
        provider: 'anthropic',
        apiKey,
        model: 'claude-sonnet-4-20250514',
      },
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

  console.log('\n=== Create New Agent ===\n');

  try {
    // Generate identity
    const keyPair = generateKeyPair();
    console.log(`Generated agent ID: ${keyPair.id}\n`);

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
    console.log(`  ANTHROPIC_API_KEY=<your-key> agent start --id ${keyPair.id}`);
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

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
