# Runtime-Dev Work Order: Task 25 - MCP Client

> From: Manager Agent
> Date: 2026-01-28
> Priority: High

## Context

The agent needs to be able to use tools provided by MCP (Model Context Protocol) servers. You already implemented the `mcp-collective` server. Now we need the client side in the agent runtime that can connect to any MCP server and expose its tools to the agent's LLM.

## Implementation Steps

### Step 1: Interface Definition

Define the `MCPClient` interface in `packages/agent-runtime/src/core/mcp/types.ts`.
It should support:
- `connect(serverUrl: string)`
- `listTools()`
- `callTool(name: string, args: any)`

### Step 2: Implementation using @modelcontextprotocol/sdk

Create `packages/agent-runtime/src/core/mcp/client.ts`.
- Use the official MCP SDK client.
- Support WebSocket transport (for `mcp-collective`).
- Support SSE transport (optional but good).
- Support Stdior transport (for local tool servers).

### Step 3: Tool Integration

The `MCPClient` should be able to "provide" tools to the agent's LLM loop (Task 24).
- Method to convert MCP tools to our internal `Tool` format (defined in `provider.ts`).

### Step 4: Multi-Server Support

The agent might connect to multiple MCP servers (e.g., collective, local filesystem, memory, etc.).
- Create `MCPRegistry` to manage multiple clients.

## Dependencies

- `@modelcontextprotocol/sdk`

## Acceptance Criteria

- [ ] Can connect to `mcp-collective` server.
- [ ] Can list tools from connected servers.
- [ ] Can call tools and get results.
- [ ] Tools are correctly mapped to normalized `Tool` format.
- [ ] Handles connection failures gracefully.

## Report To

Post progress in `agents/runtime-dev/notes.md`.

---
_Manager Agent_
