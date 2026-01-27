/**
 * MCP Client Types
 *
 * Defines the interface for communicating with MCP servers.
 */

import type { Tool } from '../llm/provider.js';

export interface MCPTool extends Tool {
  serverName: string;
}

export interface MCPClientConfig {
  name: string;
  version: string;
}

export interface MCPTransportConfig {
  type: 'websocket' | 'stdio' | 'sse';
  url?: string;
  command?: string;
  args?: string[];
}

export interface IMCPClient {
  /** Connect to the server */
  connect(): Promise<void>;
  
  /** Disconnect from the server */
  disconnect(): Promise<void>;
  
  /** List available tools */
  listTools(): Promise<MCPTool[]>;
  
  /** Call a tool */
  callTool(name: string, args: Record<string, any>): Promise<any>;
}
