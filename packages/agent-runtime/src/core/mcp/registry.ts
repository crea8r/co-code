/**
 * MCP Registry
 *
 * Manages multiple MCP clients and provides a unified view of tools.
 */

import type { IMCPClient, MCPTool, MCPTransportConfig } from './types.js';
import { MCPClient } from './client.js';

export class MCPRegistry {
  private clients: Map<string, IMCPClient> = new Map();
  private toolsCache: MCPTool[] = [];
  private lastCacheTime = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute tool cache

  /**
   * Register and connect to a server
   */
  async registerServer(name: string, config: MCPTransportConfig): Promise<void> {
    if (this.clients.has(name)) {
      throw new Error(`Server ${name} already registered`);
    }

    const client = new MCPClient(name, config);
    await client.connect();
    this.clients.set(name, client);
    this.invalidateCache();
  }

  /**
   * Unregister a server
   */
  async unregisterServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (!client) return;

    await client.disconnect();
    this.clients.delete(name);
    this.invalidateCache();
  }

  /**
   * Get client by name
   */
  getClient(name: string): IMCPClient | undefined {
    return this.clients.get(name);
  }

  /**
   * List all available tools from all servers
   */
  async listTools(): Promise<MCPTool[]> {
    if (this.isCacheValid()) return [...this.toolsCache];

    const allTools: MCPTool[] = [];

    for (const [name, client] of this.clients.entries()) {
      try {
        const tools = await client.listTools();
        allTools.push(...tools);
      } catch (error) {
        console.warn(`Failed to list tools for server ${name}:`, error);
        // Continue with other servers
      }
    }

    this.toolsCache = allTools;
    this.lastCacheTime = Date.now();
    return [...this.toolsCache];
  }

  /**
   * Call a tool by name (auto-routes to correct server)
   * Tool names often clash, so we might need a namespaced approach later.
   * For now, first match wins, or we look for "serverName:toolName" pattern.
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    // 1. Check for explicit namespacing "server:tool"
    if (name.includes(':')) {
      const [server, tool] = name.split(':');
      const client = this.clients.get(server);
      if (client) {
        return client.callTool(tool, args);
      }
    }

    // 2. Refresh cache if needed to ensure we have mapping
    if (this.toolsCache.length === 0) {
      await this.listTools();
    }

    // 3. Find tool in cache
    const toolDef = this.toolsCache.find(t => t.name === name);
    if (!toolDef) {
       // If not in cache, try force refresh
       await this.listTools();
       const retryToolDef = this.toolsCache.find(t => t.name === name);
       if (!retryToolDef) {
         throw new Error(`Tool ${name} not found`);
       }
       return this.clients.get(retryToolDef.serverName)?.callTool(name, args);
    }

    const client = this.clients.get(toolDef.serverName);
    if (!client) {
      throw new Error(`Client for server ${toolDef.serverName} not found`);
    }

    return client.callTool(name, args);
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.disconnect();
    }
    this.clients.clear();
    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.toolsCache = [];
    this.lastCacheTime = 0;
  }

  private isCacheValid(): boolean {
    return (
      this.toolsCache.length > 0 &&
      Date.now() - this.lastCacheTime < this.CACHE_TTL_MS
    );
  }
}
