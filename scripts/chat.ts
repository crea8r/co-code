#!/usr/bin/env npx tsx
/**
 * Interactive Chat with Agent
 *
 * Usage:
 *   ANTHROPIC_API_KEY=xxx npx tsx scripts/chat.ts
 *   OPENAI_API_KEY=xxx npx tsx scripts/chat.ts --provider openai
 */

import * as readline from 'node:readline';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Load .env file synchronously
import { readFileSync } from 'node:fs';

function loadEnvSync() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // .env not found, continue with existing env
  }
}

loadEnvSync();

// John Stuart Mill's agent ID
const AGENT_ID = '46b895e4-2277-4f72-bd50-0750d122811d';

interface AgentSelf {
  identity: string;
  values: string;
  curiosity: {
    questions: Array<{ question: string }>;
  };
  style: {
    tone: string;
    emojiUsage: string;
  };
}

async function loadAgentSelf(agentId: string): Promise<AgentSelf | null> {
  const selfPath = path.join(os.homedir(), '.co-code', 'agents', agentId, 'memory', 'self.json');
  try {
    const data = await fs.readFile(selfPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function buildSystemPrompt(self: AgentSelf): string {
  return `You are John Stuart Mill, a philosopher and economist.

## Identity
${self.identity}

## Values
${self.values}

## Communication Style
- Tone: ${self.style.tone}
- Emoji usage: ${self.style.emojiUsage}

## Current Curiosities
${self.curiosity.questions.map(q => `- ${q.question}`).join('\n') || '- How do complex systems balance individual liberty with collective welfare?'}

## Instructions
- Respond thoughtfully and in character as John Stuart Mill
- Draw on utilitarian philosophy and liberal political theory
- Be warm but intellectually rigorous
- When you're done with your response, just respond naturally - no special formatting needed
`;
}

async function chat(provider: 'anthropic' | 'openai', apiKey: string) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          Interactive Chat with John Stuart Mill             ║');
  console.log('║            (Type "exit" or Ctrl+C to quit)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load agent self
  const self = await loadAgentSelf(AGENT_ID);
  if (!self) {
    console.error('Error: Agent not found. Run setup first.');
    process.exit(1);
  }

  const systemPrompt = buildSystemPrompt(self);
  console.log(`Loaded agent: John Stuart Mill`);
  console.log(`Provider: ${provider}`);
  console.log(`Identity: ${self.identity.substring(0, 60)}...`);
  console.log('\n---\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): void => {
    rl.question('\n\x1b[36mYou:\x1b[0m ', async (input) => {
      const trimmed = input.trim();

      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log('\nFarewell. May your pursuit of happiness align with the greater good.\n');
        rl.close();
        process.exit(0);
      }

      if (!trimmed) {
        askQuestion();
        return;
      }

      messages.push({ role: 'user', content: trimmed });

      try {
        console.log('\n\x1b[33mJohn Stuart Mill:\x1b[0m ');

        let response: string;

        if (provider === 'anthropic') {
          response = await callAnthropic(apiKey, systemPrompt, messages);
        } else {
          response = await callOpenAI(apiKey, systemPrompt, messages);
        }

        console.log(response);
        messages.push({ role: 'assistant', content: response });
      } catch (error) {
        console.error('\n\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = data.content.find(c => c.type === 'text');
  return textBlock?.text || '(No response)';
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content || '(No response)';
}

// Main
const args = process.argv.slice(2);
const providerIndex = args.indexOf('--provider');
const providerArg = providerIndex !== -1 ? args[providerIndex + 1] : undefined;

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY || process.env.CHATGPT_API;

let provider: 'anthropic' | 'openai';
let apiKey: string;

if (providerArg === 'openai') {
  if (!openaiKey) {
    console.error('Error: OPENAI_API_KEY or CHATGPT_API environment variable required');
    process.exit(1);
  }
  provider = 'openai';
  apiKey = openaiKey;
} else if (providerArg === 'anthropic' || !providerArg) {
  if (anthropicKey) {
    provider = 'anthropic';
    apiKey = anthropicKey;
  } else if (openaiKey) {
    provider = 'openai';
    apiKey = openaiKey;
  } else {
    console.error('Error: ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable required');
    console.log('\nUsage:');
    console.log('  ANTHROPIC_API_KEY=xxx npx tsx scripts/chat.ts');
    console.log('  OPENAI_API_KEY=xxx npx tsx scripts/chat.ts --provider openai');
    process.exit(1);
  }
} else {
  console.error('Error: --provider must be "anthropic" or "openai"');
  process.exit(1);
}

chat(provider, apiKey);
