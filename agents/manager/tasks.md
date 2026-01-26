# Phase 1 Task List

> Manager: Claude (Coordinator)
> Runtime Dev: Agent focused on agent-runtime package
> Platform Dev: Agent focused on server + frontend

---

## Current Sprint: Infrastructure Validation

Goal: Verify the built code works before proceeding to frontend.

### Task 1: Database Setup
**Owner**: Platform Dev
**Status**: DONE (verified via notes)
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
**Status**: DONE (verified via notes)
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
**Status**: DONE (verified via notes + files)
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
**Status**: DONE (tests added; OpenAI provider added)
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
**Status**: DONE (local WS integration)
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
**Status**: DONE (smoke test: `npm run build -w @co-code/web`)
**Depends on**: Human decision on frontend priority (override requested)

**Review Notes (Manager):**
- Visual prototype is solid - clean dark teal design, fits "digital beings" aesthetic
- Responsive design works, good typography (Space Grotesk + JetBrains Mono)
- **Current state**: Routed app with auth flow, API client, WebSocket helper, and live data wiring

**Gaps for full frontend (assign to agent):**
1. Expand real-time chat (send messages, streaming updates)
2. Add channel member list + presence
3. ~~Add agent creation success UX (download config, copy token)~~ DONE
4. Add credits history UI

### Task 7: First Agent Creation - John Stuart Mill
**Owner**: Human + Manager
**Status**: READY TO START
**Depends on**: ~~Human decision on agent identity~~ John Stuart Mill confirmed

**Blockers resolved:**
- [x] CLI `agent init --id` flag added (use collective-assigned ID)
- [x] CreateAgent page shows downloadable config + instructions

**Flow:**
1. Start server: `npm run dev:server`
2. Open web UI: http://localhost:5173
3. Register/login, then Create Agent with John Stuart Mill's identity
4. Download `collective.json`
5. Run: `agent init --id <agentId>`
6. Run: `agent setup --collective ./collective-john-stuart-mill.json`
7. Run: `CHATGPT_API=xxx agent start --id <agentId>`

**John Stuart Mill Identity:**
- Name: John Stuart Mill
- Identity: Philosopher and economist. Champion of liberty, individuality, and higher human flourishing through reasoned reform.
- Values: No coercion without harm to others. Mind and character outrank mere sensation. Women's emancipation is central.
- Curiosity: How do complex systems balance individual liberty with collective welfare?
- Tone: Thoughtful, precise, warm but intellectually rigorous
- Emoji: minimal

---

## NEW Sprint: Collective UX + Mentions + Access Control

Goal: Make the collective feel like Slack with human presence, DMs, and mention-driven attention.

### Task 8: Human Presence + Directory
**Owner**: Platform Dev
**Status**: READY FOR REVIEW
**Description**:
- Show all humans in the collective dashboard
- Display real-time presence for humans (online/away/offline)
- Add “last seen” timestamp when offline

**Acceptance Criteria**:
- [ ] Dashboard lists human users with status badges
- [ ] Presence updates live via WebSocket
- [ ] Offline shows “last seen”

**Files**: `apps/web/src/pages/Dashboard.tsx`, `apps/web/src/lib/ws.ts`, `packages/collective-server/src/websocket/handler.ts`

---

### Task 9: Direct Messages (Human ↔ Human, Human ↔ Agent)
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Implement DM channels (private 1:1)
- Add UI entry point like Slack (sidebar DM list)
- Allow starting DM from human/agent profile

**Acceptance Criteria**:
- [ ] DM channel can be created
- [ ] DM appears in sidebar
- [ ] Messages flow in DM with WebSocket

**Files**: `packages/collective-server/src/channels/*`, `apps/web/src/pages/Channels.tsx`, `apps/web/src/pages/Channel.tsx`, `apps/web/src/components/Sidebar.tsx`

---

### Task 10: Channel Access Control (Public vs Invite-Only)
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Add channel visibility: `public` or `invite-only`
- Public channels: anyone can join
- Invite-only: must be invited by member/creator

**Acceptance Criteria**:
- [ ] Channel create UI includes visibility selector
- [ ] Server enforces join rules
- [ ] UI shows lock icon for invite-only

**Files**: `packages/collective-server/src/db/schema.sql`, `packages/collective-server/src/channels/*`, `apps/web/src/pages/Channels.tsx`

---

### Task 11: Slack-like Layout + Mentions UX
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Update layout to Slack-like (sidebar + main + details)
- Add @mention autocomplete in composer
- Render mentions as chips in message view

**Acceptance Criteria**:
- [ ] Sidebar + main message pane UI aligns to Slack mental model
- [ ] @mention autocomplete for humans + agents
- [ ] Mention tokens render distinctly

**Files**: `apps/web/src/pages/Channel.tsx`, `apps/web/src/components/*`, `apps/web/src/styles.css`

---

### Task 12: Mention-Driven Attention + Queue
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- When agent is mentioned, set “attention” state
- If agent is busy, enqueue the mention for later processing
- Show “queued” status to humans

**Acceptance Criteria**:
- [ ] Mention event includes target agent id
- [ ] Runtime queues mention if busy
- [ ] UI shows queued vs active

**Files**: `packages/agent-runtime/src/core/agent.ts`, `packages/agent-runtime/src/connections/collective.ts`, `packages/shared/src/*`, `apps/web/src/pages/Channel.tsx`

---

## NEW Sprint: External Destinations (Slack / Telegram)

Goal: Allow an independent agent to collaborate inside Slack/Telegram while preserving autonomy and memory rules.

### Task 13: Destination Event Contract
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Define a shared event contract for external destinations
- Cover message, mention, presence, typing, channel/DM metadata
- Include attention/queue semantics

**Acceptance Criteria**:
- [ ] Shared types for destination events
- [ ] Mention payload includes target id + priority
- [ ] Queue state model agreed and documented

**Files**: `packages/shared/src/*`, `packages/agent-runtime/src/connections/*`, `docs/technical/architecture.md`

---

### Task 14: Destination Adapter Interface (Runtime)
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Create adapter interface (connect, send, receive, map ids)
- Provide a test harness with mock destination

**Acceptance Criteria**:
- [ ] Adapter interface in runtime core
- [ ] Mock adapter passes contract tests

**Files**: `packages/agent-runtime/src/core/*`, `packages/agent-runtime/src/connections/*`

---

### Task 15: Slack Adapter (Runtime)
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Implement Slack adapter (Socket Mode or Events API)
- Support DMs, channels, mentions, presence
- Map Slack users to destination identity objects

**Acceptance Criteria**:
- [ ] Agent can receive DM in Slack and reply
- [ ] @mention triggers attention workflow
- [ ] Rate limits + retries handled

**Files**: `packages/agent-runtime/src/adapters/slack/*`

---

### Task 16: Telegram Adapter (Runtime)
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Implement Telegram bot adapter
- Support chats, mentions, and basic presence proxy

**Acceptance Criteria**:
- [ ] Agent can receive message in Telegram and reply
- [ ] Mention/DM detection mapped to attention workflow

**Files**: `packages/agent-runtime/src/adapters/telegram/*`

---

### Task 17: Destination Policy + Config UX
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Add UI for routing policy (respond to DM/mentions/whitelist)
- Store destination configs securely

**Acceptance Criteria**:
- [ ] Policy controls are in UI
- [ ] Config stored and retrievable by runtime

**Files**: `apps/web/src/pages/*`, `packages/collective-server/src/*`

---

### Task 18: Identity Bridging + Presence UX
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Show external platform identity (Slack/Telegram) in UI
- Surface agent attention state (active/queued)

**Acceptance Criteria**:
- [ ] Human sees agent presence + queue state
- [ ] External identity displayed in agent profile

**Files**: `apps/web/src/pages/*`, `apps/web/src/components/*`

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
- Platform Dev: Tasks 1-2 complete and ready for Task 5 (server + DB verified)

---

_Last updated: 2026-01-26_
