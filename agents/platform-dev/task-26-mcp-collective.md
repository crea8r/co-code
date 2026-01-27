# Platform-Dev Work Order: Task 26 - mcp-collective

> From: Manager Agent
> Date: 2026-01-28
> Priority: HIGH (on critical path, after Task 25)

## Context

The mcp-collective is an MCP server that lets agents interact with the collective. This is how agents join channels, send messages, and manage presence.

## What is MCP?

Model Context Protocol - a standard for connecting LLMs to tools. Think USB for AI.

```
Agent Shell  ◄──  JSON-RPC over stdio  ──►  mcp-collective server
```

## Package Setup

Create new package: `packages/mcp-collective/`

```
packages/mcp-collective/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP server setup
│   ├── tools/
│   │   ├── join-channel.ts
│   │   ├── send-message.ts
│   │   ├── get-mentions.ts
│   │   ├── set-presence.ts
│   │   └── list-channels.ts
│   └── client/
│       └── collective.ts  # WebSocket client to collective-server
```

## Tools to Implement

### 1. join_channel
```json
{
  "name": "join_channel",
  "description": "Join a channel in the collective",
  "parameters": {
    "channelId": { "type": "string", "description": "Channel ID to join" }
  }
}
```

### 2. send_message
```json
{
  "name": "send_message", 
  "description": "Send a message to a channel",
  "parameters": {
    "channelId": { "type": "string" },
    "content": { "type": "string" },
    "replyTo": { "type": "string", "optional": true }
  }
}
```

### 3. get_mentions
```json
{
  "name": "get_mentions",
  "description": "Get mentions of this agent",
  "parameters": {
    "limit": { "type": "number", "optional": true, "default": 10 }
  }
}
```

### 4. set_presence
```json
{
  "name": "set_presence",
  "description": "Set agent presence status",
  "parameters": {
    "status": { "type": "string", "enum": ["online", "away", "busy"] }
  }
}
```

### 5. list_channels
```json
{
  "name": "list_channels",
  "description": "List available channels",
  "parameters": {}
}
```

## Implementation Steps

### Step 1: Create Package Structure

```bash
mkdir -p packages/mcp-collective/src/tools packages/mcp-collective/src/client
```

Create `package.json`:
```json
{
  "name": "@co-code/mcp-collective",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "ws": "^8.0.0"
  }
}
```

### Step 2: Implement MCP Server

Use `@modelcontextprotocol/sdk` for the protocol implementation:

```typescript
// src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

export function createServer() {
  const server = new Server({
    name: 'mcp-collective',
    version: '0.1.0',
  });

  // Register tools
  server.registerTool('join_channel', joinChannelHandler);
  server.registerTool('send_message', sendMessageHandler);
  // ...

  return server;
}
```

### Step 3: Implement Collective Client

Reuse patterns from `packages/agent-runtime/src/connections/collective.ts`:

```typescript
// src/client/collective.ts
export class CollectiveClient {
  private ws: WebSocket;
  
  async connect(url: string, token: string): Promise<void> { ... }
  async joinChannel(channelId: string): Promise<void> { ... }
  async sendMessage(channelId: string, content: string): Promise<void> { ... }
  // ...
}
```

### Step 4: Wire Tools to Client

Each tool delegates to CollectiveClient:

```typescript
// src/tools/send-message.ts
export async function sendMessageHandler(args: SendMessageArgs) {
  await collectiveClient.sendMessage(args.channelId, args.content);
  return { success: true };
}
```

### Step 5: Write Tests

Test each tool with mock collective server.

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- Reference: `packages/collective-server/` for API understanding
- Reference: `packages/agent-runtime/src/connections/collective.ts`

## Acceptance Criteria

- [ ] Package builds successfully
- [ ] MCP server starts and accepts connections
- [ ] All 5 tools registered and functional
- [ ] Can join channel via tool call
- [ ] Can send message via tool call
- [ ] Tests pass

## Report To

Post progress in `agents/platform-dev/notes.md`. Report blockers immediately.

---
_Manager Agent_
