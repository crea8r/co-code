# Phase 1 Task List

> Manager: Claude (Coordinator)
> Runtime Dev: Agent focused on agent-runtime package
> Platform Dev: Agent focused on server + frontend

---

## Current Sprint: Infrastructure Validation

Goal: Verify the built code works before proceeding to frontend.

### Task 1: Database Setup
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Create PostgreSQL database locally
- Run the schema from `packages/collective-server/src/db/schema.sql`
- Verify tables created correctly
- Document connection string format

**Acceptance Criteria**:
- [ ] Database `cocode` exists
- [ ] All tables from schema created
- [ ] Can connect from Node.js

**Files**: `packages/collective-server/src/db/`

---

### Task 2: Test Server Endpoints
**Owner**: Platform Dev
**Status**: BLOCKED (needs Task 1)
**Description**:
- Start the server locally
- Test auth endpoints (register, login)
- Test channel endpoints
- Test credit endpoints
- Document any bugs found

**Acceptance Criteria**:
- [ ] Server starts without errors
- [ ] Can register a user via API
- [ ] Can login and get JWT
- [ ] Can create a channel
- [ ] WebSocket connects

**Files**: `packages/collective-server/src/`

---

### Task 3: Test Agent Runtime CLI
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Run `agent init` to create a new agent
- Verify files created in `~/.co-code/agents/`
- Check identity generation works
- Check self memory saved correctly

**Acceptance Criteria**:
- [ ] `agent init` creates agent successfully
- [ ] Private key generated and stored
- [ ] Self memory file created with correct structure
- [ ] Agent ID is valid UUID

**Files**: `packages/agent-runtime/src/platforms/node/cli.ts`

---

### Task 4: Test Agent Runtime Core
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Write basic tests for memory store
- Write tests for identity/key generation
- Test LLM provider (mock or real)
- Ensure consolidation logic works

**Acceptance Criteria**:
- [ ] Tests pass for MemoryStore
- [ ] Tests pass for key generation/signing
- [ ] LLM provider can make a call (if API key available)

**Files**: `packages/agent-runtime/src/core/`

---

### Task 5: Integration Test - Agent Connects to Server
**Owner**: Manager (coordinates both agents)
**Status**: BLOCKED (needs Tasks 1-4)
**Description**:
- Start server
- Start agent with server URL
- Verify agent can:
  - Authenticate via WebSocket
  - Join a channel
  - Receive and respond to messages

**Acceptance Criteria**:
- [ ] Agent connects to server via WebSocket
- [ ] Agent authenticates successfully
- [ ] Agent can join a channel
- [ ] Agent receives messages
- [ ] Agent can send responses

---

## CHECKPOINT: Human Decision Required

**After Task 5 completes, we need human input on:**

1. **Frontend Priority**: Should we build full React frontend, or a minimal test UI first?
2. **First Agent Identity**: What should the first real agent be like? (name, personality, values)
3. **Deployment**: Local testing only for now, or set up staging server?

---

## Next Sprint (Pending Human Input)

### Task 6: React Frontend - Basic Shell
**Owner**: Platform Dev
**Status**: PENDING
**Depends on**: Human decision on frontend priority

### Task 7: First Agent Creation
**Owner**: Human + Manager
**Status**: PENDING
**Depends on**: Human decision on agent identity

---

## Task Assignment Summary

| Agent | Current Tasks |
|-------|---------------|
| Runtime Dev | Task 3, Task 4 |
| Platform Dev | Task 1, Task 2 |
| Manager | Task 5 (after 1-4), Coordination |

---

## Notes

- Tasks 1-4 can run in parallel
- Task 5 requires both agents' work to be complete
- We stop at the checkpoint to get human direction before building UI
- This prevents wasted work if priorities change

---

_Last updated: 2025-01-25_
