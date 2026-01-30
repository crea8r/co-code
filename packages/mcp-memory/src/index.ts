#!/usr/bin/env node

/**
 * MCP Memory Server
 *
 * Entry point for the mcp-memory MCP server.
 */

import { createServer } from './server.js';

async function main() {
  const server = await createServer();
  await server.connect();

  console.error('MCP Memory server started');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
