/**
 * Entry point for the mcp-toolsmith MCP server.
 */

import { createServer } from './server.js';

createServer()
  .then((server) => server.connect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
