#!/usr/bin/env npx tsx
/**
 * One-shot test of John Stuart Mill agent
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Load .env
function loadEnvSync() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
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
  } catch {}
}

loadEnvSync();

const AGENT_ID = '46b895e4-2277-4f72-bd50-0750d122811d';

interface AgentSelf {
  identity: string;
  values: string;
  curiosity: { questions: Array<{ question: string }> };
  style: { tone: string; emojiUsage: string };
}

function loadAgentSelf(): AgentSelf | null {
  const selfPath = path.join(os.homedir(), '.co-code', 'agents', AGENT_ID, 'memory', 'self.json');
  try {
    return JSON.parse(fs.readFileSync(selfPath, 'utf-8'));
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

## Instructions
- Respond thoughtfully and in character as John Stuart Mill
- Draw on utilitarian philosophy and liberal political theory
- Be warm but intellectually rigorous
- Keep your response concise (2-3 paragraphs max)
`;
}

async function testAgent() {
  const self = loadAgentSelf();
  if (!self) {
    console.error('Agent not found');
    process.exit(1);
  }

  const apiKey = process.env.CHATGPT_API || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('No API key found');
    process.exit(1);
  }

  const userMessage = process.argv[2] || "What is the relationship between individual liberty and the greater good?";

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              Testing John Stuart Mill Agent                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Identity: ${self.identity}`);
  console.log(`\n\x1b[36mYou:\x1b[0m ${userMessage}\n`);
  console.log('\x1b[33mJohn Stuart Mill:\x1b[0m\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: buildSystemPrompt(self) },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`API Error: ${response.status} - ${error}`);
    process.exit(1);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  console.log(data.choices[0]?.message?.content || '(No response)');
  console.log(`\n---\nTokens: ${data.usage.prompt_tokens} in / ${data.usage.completion_tokens} out`);
}

testAgent();
