#!/usr/bin/env node

/**
 * MCP Collective Server
 * 
 * Entry point for the mcp-collective MCP server.
 * Exposes collective communication tools to agents via MCP protocol.
 */

import { createServer } from './server.js';

async function main() {
  const server = await createServer();
  await server.connect();
  
  console.error('MCP Collective server started');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
