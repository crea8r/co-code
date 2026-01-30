/**
 * MCP Memory Server Implementation
 *
 * Tools: recall, remember, reflect
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as path from 'node:path';
import { FileMemoryStore } from './memory-store.js';

const recallSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
});

const rememberSchema = z.object({
  content: z.string(),
  tags: z.array(z.string()).optional(),
});

const reflectSchema = z.object({
  prompt: z.string(),
});

const listSchema = z.object({
  limit: z.number().optional(),
  tag: z.string().optional(),
});

function createStore(): FileMemoryStore {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  const explicitPath = process.env.MCP_MEMORY_PATH;
  const agentHome =
    process.env.AGENT_HOME ||
    process.env.CO_CODE_AGENT_HOME ||
    process.env.AGENT_PATH;
  const agentId = process.env.AGENT_ID;

  const filePath =
    explicitPath ||
    (agentHome
      ? path.join(agentHome, 'memories', 'memory.json')
      : agentId
        ? path.join(home, '.co-code', 'agents', agentId, 'memories', 'memory.json')
        : path.join(home, '.co-code', 'memory.json'));
  return new FileMemoryStore(filePath);
}

export async function createServer() {
  const server = new Server(
    {
      name: 'mcp-memory',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'recall',
        description: 'Search stored memory entries',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'remember',
        description: 'Store a memory entry',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['content'],
        },
      },
      {
        name: 'reflect',
        description: 'Record a reflection (stored as memory entry)',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'list_memories',
        description: 'List stored memories (optionally filtered by tag)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            tag: { type: 'string' },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const store = createStore();

    try {
      switch (name) {
        case 'recall': {
          const parsed = recallSchema.parse(args);
          const results = await store.search(parsed.query, parsed.limit ?? 10);
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        }
        case 'remember': {
          const parsed = rememberSchema.parse(args);
          await store.addEntry({
            id: crypto.randomUUID(),
            content: parsed.content,
            tags: parsed.tags ?? [],
            createdAt: Date.now(),
          });
          return { content: [{ type: 'text', text: 'ok' }] };
        }
        case 'reflect': {
          const parsed = reflectSchema.parse(args);
          await store.addEntry({
            id: crypto.randomUUID(),
            content: `Reflection: ${parsed.prompt}`,
            tags: ['reflection'],
            createdAt: Date.now(),
          });
          return { content: [{ type: 'text', text: 'ok' }] };
        }
        case 'list_memories': {
          const parsed = listSchema.parse(args ?? {});
          const results = await store.list(parsed.limit ?? 50, parsed.tag);
          return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return {
    async connect() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },
  };
}
