/**
 * MCP Collective Server Tests
 *
 * Tests for the MCP tools in mcp-collective.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CollectiveClient } from '../client/collective.js';
import { createServer } from '../server.js';

// Mock the CollectiveClient
vi.mock('../client/collective.js', () => {
  return {
    CollectiveClient: vi.fn().mockImplementation(() => {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        listChannels: vi.fn().mockResolvedValue([
          { id: 'c1', name: 'general', type: 'public' }
        ]),
        joinChannel: vi.fn().mockResolvedValue(undefined),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        getMentions: vi.fn().mockResolvedValue([]),
        setPresence: vi.fn().mockResolvedValue(undefined),
      };
    })
  };
});

describe('MCP Collective Tools', () => {
  // We can't easily test the full Stdio transport here without more setup,
  // but we can test the tool logic if we expose the server's call handlers.
  // For now, these unit tests will verify our client logic is called correctly.
  
  it('should have tools defined', async () => {
    // This is more of a placeholder since our createServer returns a wrapper.
    // In a real scenario, we'd use the MCP SDK's test utilities if they exist.
    const serverWrapper = await createServer();
    expect(serverWrapper.connect).toBeDefined();
  });
});
