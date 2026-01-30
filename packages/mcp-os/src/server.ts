/**
 * MCP OS Server Implementation
 *
 * Exposes file and shell tools.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFile, writeFile, editFile } from './fs.js';
import { runCommand, globPaths, grepText } from './shell.js';

const readFileSchema = z.object({ path: z.string() });
const writeFileSchema = z.object({ path: z.string(), content: z.string() });
const editFileSchema = z.object({
  path: z.string(),
  searchText: z.string(),
  replaceText: z.string(),
  replaceAll: z.boolean().optional(),
});
const bashSchema = z.object({ command: z.string(), cwd: z.string().optional() });
const globSchema = z.object({ pattern: z.string(), cwd: z.string().optional() });
const grepSchema = z.object({ pattern: z.string(), path: z.string(), cwd: z.string().optional() });

export async function createServer() {
  const server = new Server(
    {
      name: 'mcp-os',
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
        name: 'read_file',
        description: 'Read a text file from disk',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write text content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'edit_file',
        description: 'Replace text in a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            searchText: { type: 'string' },
            replaceText: { type: 'string' },
            replaceAll: { type: 'boolean' },
          },
          required: ['path', 'searchText', 'replaceText'],
        },
      },
      {
        name: 'bash',
        description: 'Run a shell command',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            cwd: { type: 'string' },
          },
          required: ['command'],
        },
      },
      {
        name: 'glob',
        description: 'List files matching a glob pattern',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            cwd: { type: 'string' },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'grep',
        description: 'Search for text within files',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string' },
            path: { type: 'string' },
            cwd: { type: 'string' },
          },
          required: ['pattern', 'path'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'read_file': {
          const parsed = readFileSchema.parse(args);
          const content = await readFile(parsed.path);
          return { content: [{ type: 'text', text: content }] };
        }
        case 'write_file': {
          const parsed = writeFileSchema.parse(args);
          await writeFile(parsed.path, parsed.content);
          return { content: [{ type: 'text', text: 'ok' }] };
        }
        case 'edit_file': {
          const parsed = editFileSchema.parse(args);
          const result = await editFile(
            parsed.path,
            parsed.searchText,
            parsed.replaceText,
            parsed.replaceAll
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }
        case 'bash': {
          const parsed = bashSchema.parse(args);
          const result = await runCommand(parsed.command, { cwd: parsed.cwd });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          };
        }
        case 'glob': {
          const parsed = globSchema.parse(args);
          const matches = await globPaths(parsed.pattern, parsed.cwd);
          return { content: [{ type: 'text', text: JSON.stringify(matches) }] };
        }
        case 'grep': {
          const parsed = grepSchema.parse(args);
          const matches = await grepText(parsed.pattern, parsed.path, parsed.cwd);
          return { content: [{ type: 'text', text: JSON.stringify(matches) }] };
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
