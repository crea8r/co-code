/**
 * MCP Server Implementation
 *
 * Sets up the MCP server with tools for collective interaction.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CollectiveClient } from './client/collective.js';

export async function createServer() {
  const client = new CollectiveClient();
  
  const server = new Server(
    {
      name: 'mcp-collective',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'join_channel',
        description: 'Join a channel in the collective',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: { type: 'string', description: 'Channel ID to join' },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'send_message',
        description: 'Send a message to a channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: { type: 'string' },
            content: { type: 'string' },
            replyTo: { type: 'string' },
          },
          required: ['channelId', 'content'],
        },
      },
      {
        name: 'get_mentions',
        description: 'Get mentions of this agent',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max number of mentions to return' },
          },
        },
      },
      {
        name: 'set_presence',
        description: 'Set agent presence status',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['online', 'away', 'busy'] },
          },
          required: ['status'],
        },
      },
      {
        name: 'list_channels',
        description: 'List available channels',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'connect_collective',
        description: 'Connect to the collective server',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            agentId: { type: 'string' },
            token: { type: 'string' },
          },
          required: ['url', 'agentId', 'token'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'connect_collective': {
          const { url, agentId, token } = args as any;
          await client.connect({ url, agentId, token });
          return { content: [{ type: 'text', text: 'Connected to collective' }] };
        }

        case 'list_channels': {
          const channels = await client.listChannels();
          return { content: [{ type: 'text', text: JSON.stringify(channels, null, 2) }] };
        }

        case 'join_channel': {
          const { channelId } = args as any;
          await client.joinChannel(channelId);
          return { content: [{ type: 'text', text: `Joined channel ${channelId}` }] };
        }

        case 'send_message': {
          const { channelId, content, replyTo } = args as any;
          await client.sendMessage(channelId, content, replyTo);
          return { content: [{ type: 'text', text: 'Message sent' }] };
        }

        case 'get_mentions': {
          const { limit } = args as any;
          const mentions = await client.getMentions(limit);
          return { content: [{ type: 'text', text: JSON.stringify(mentions, null, 2) }] };
        }

        case 'set_presence': {
          const { status } = args as any;
          await client.setPresence(status);
          return { content: [{ type: 'text', text: `Presence set to ${status}` }] };
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
