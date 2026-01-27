/**
 * MCP Registry Tests
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MCPRegistry } from '../mcp/registry.js';

// Mock the MCPClient class
vi.mock('../mcp/client.js', () => {
  return {
    MCPClient: vi.fn().mockImplementation((name, config) => {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        listTools: vi.fn().mockResolvedValue([
          {
            name: `${name}_tool`,
            description: `Tool from ${name}`,
            parameters: {},
            serverName: name,
          },
        ]),
        callTool: vi.fn().mockImplementation(async (toolName, args) => {
          return `Called ${toolName} with ${JSON.stringify(args)}`;
        }),
      };
    }),
  };
});

describe('MCPRegistry', () => {
  let registry: MCPRegistry;

  beforeEach(() => {
    registry = new MCPRegistry();
  });

  it('registers servers and lists aggregated tools', async () => {
    await registry.registerServer('server1', { type: 'stdio', command: 'cmd1' });
    await registry.registerServer('server2', { type: 'stdio', command: 'cmd2' });

    const tools = await registry.listTools();

    expect(tools).toHaveLength(2);
    expect(tools).toContainEqual(expect.objectContaining({ name: 'server1_tool', serverName: 'server1' }));
    expect(tools).toContainEqual(expect.objectContaining({ name: 'server2_tool', serverName: 'server2' }));
  });

  it('routes tool calls to the correct server', async () => {
    await registry.registerServer('server1', { type: 'stdio', command: 'cmd1' });
    
    // Populate cache
    await registry.listTools();

    const result = await registry.callTool('server1_tool', { arg: 1 });
    expect(result).toBe('Called server1_tool with {"arg":1}');
  });

  it('throws error if tool not found', async () => {
    await expect(registry.callTool('unknown_tool', {})).rejects.toThrow('Tool unknown_tool not found');
  });

  it('supports explicit namespacing', async () => {
    await registry.registerServer('server1', { type: 'stdio', command: 'cmd1' });
    
    // Should work without cache population because of explicit namespace routing
    const result = await registry.callTool('server1:server1_tool', { arg: 2 });
    expect(result).toBe('Called server1_tool with {"arg":2}');
  });
});
