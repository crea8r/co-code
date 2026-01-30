/**
 * MCP Client Implementation
 *
 * Connects to MCP servers (Stdio, WebSocket, SSE) and exposes tools.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { IMCPClient, MCPTransportConfig, MCPTool } from './types.js';

export class MCPClient implements IMCPClient {
  private client: Client;
  private transport: Transport | null = null;
  private serverName: string;

  constructor(
    serverName: string,
    private config: MCPTransportConfig
  ) {
    this.serverName = serverName;
    this.client = new Client(
      {
        name: 'co-code-agent-runtime',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {}, // We consume tools
        },
      }
    );
  }

  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    if (this.transport) return;

    switch (this.config.type) {
      case 'websocket':
        if (!this.config.url) throw new Error('URL required for WebSocket transport');
        // The WebSocketClientTransport expects a URL string, checking SDK docs...
        // Assuming SDK v0.6+ accepts string url
        this.transport = new WebSocketClientTransport(new URL(this.config.url));
        break;

      case 'stdio':
        if (!this.config.command) throw new Error('Command required for Stdio transport');
        this.transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
        });
        break;

      case 'sse':
        if (!this.config.url) throw new Error('URL required for SSE transport');
        this.transport = new SSEClientTransport(new URL(this.config.url));
        break;

      default:
        throw new Error(`Unsupported transport type: ${this.config.type}`);
    }

    await this.client.connect(this.transport);
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    if (!this.transport) return;
    await this.transport.close();
    this.transport = null;
  }

  /**
   * List available tools and convert to internal format
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.transport) await this.connect();

    const result = await this.client.listTools();
    
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema as Record<string, any>,
      serverName: this.serverName,
    }));
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.transport) await this.connect();

    const result = await this.client.callTool({
      name,
      arguments: args,
    });

    // Type for content items from MCP SDK
    type ContentItem = { type: string; text?: string; mimeType?: string; resource?: { uri: string } };
    const content = result.content as ContentItem[];

    // Check for error in content
    if (result.isError) {
      const errorText = content
        .map((c: ContentItem) => (c.type === 'text' ? c.text : ''))
        .join('\n');
      throw new Error(`Tool call failed: ${errorText}`);
    }

    // Combine text content
    const output = content
      .map((c: ContentItem) => {
        if (c.type === 'text') return c.text;
        if (c.type === 'image') return `[Image: ${c.mimeType}]`; // Basic handling for now
        if (c.type === 'resource') return `[Resource: ${c.resource?.uri}]`;
        return '';
      })
      .join('\n');

    return output;
  }
}
