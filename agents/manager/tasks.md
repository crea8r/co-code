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
**Status**: DONE (live test: users + presence/last seen)
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
**Status**: DONE (live test: /channels/dm + WS message)
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
**Status**: DONE (live test: REST + WS invite-only enforcement)
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
**Status**: DONE (verified 2026-01-26)
**Description**:
- Update layout to Slack-like (sidebar + main + details)
- Add @mention autocomplete in composer
- Render mentions as chips in message view

**Acceptance Criteria**:
- [x] Sidebar + main message pane UI aligns to Slack mental model
- [x] @mention autocomplete for humans + agents
- [x] Mention tokens render distinctly

**Files**: `apps/web/src/pages/Channel.tsx`, `apps/web/src/components/*`, `apps/web/src/styles.css`

---

### Task 12: Mention-Driven Attention + Queue
**Owner**: Runtime Dev
**Status**: TODO (live test failed: no attention_change events)
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

### Task 19: Structured Mention Data
**Owner**: Platform Dev
**Status**: READY FOR REVIEW
**Priority**: Medium (enhances Task 12)
**Description**:
- Currently mentions are raw text (`@john`). Add structured mention data to enable notifications and attention routing.
- Server extracts mentions from message text before broadcast
- Include `mentionedIds` array in message payload

**Acceptance Criteria**:
- [ ] Message schema includes `mentionedIds: string[]`
- [ ] Server parses `@name` patterns and resolves to user/agent IDs
- [ ] Broadcast includes resolved mention IDs for downstream consumers

**Files**: `packages/shared/src/types/message.ts`, `packages/collective-server/src/channels/service.ts`, `packages/collective-server/src/websocket/handler.ts`

---

## NEW Sprint: External Destinations (Slack / Telegram)

Goal: Allow an independent agent to collaborate inside Slack/Telegram while preserving autonomy and memory rules.

### Task 13: Destination Event Contract
**Owner**: Runtime Dev
**Status**: REVIEW (per roadmap)
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
**Status**: REVIEW (per roadmap)
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
**Status**: REVIEW (per roadmap)
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
**Status**: READY FOR REVIEW
**Description**:
- Show external platform identity (Slack/Telegram) in UI
- Surface agent attention state (active/queued)

**Acceptance Criteria**:
- [ ] Human sees agent presence + queue state
- [ ] External identity displayed in agent profile

**Files**: `apps/web/src/pages/*`, `apps/web/src/components/*`

---

## NEW Sprint: Agent Shell (LLM-Agnostic Runtime)

Goal: Ship the minimal agent shell with identity loader, agentic loop, and MCP.

### Task 19: Structured Mention Data
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- Include mentionedIds in message payload
- Server extracts @mentions into structured data

**Acceptance Criteria**:
- [ ] Message payload includes structured mentions
- [ ] Server extracts and stores mentions

**Files**: `packages/shared/src/types/*`, `packages/collective-server/src/websocket/handler.ts`

---

### Task 20: Identity File Format Spec
**Owner**: Human + Manager
**Status**: DONE
**Description**:
- Directory structure: soul/, self/, memories/, core/
- Soul immutable, self mutable at different rates
- Budget is NOT self (external constraint)
- Provider selection: unconscious + protected (no brainwash)

---

### Task 21: LLM Provider Abstraction (Spec)
**Owner**: Runtime Dev
**Status**: SPEC DONE
**Description**:
- Anthropic, OpenAI, Qwen, Local (Ollama)
- Token counting and fallback

---

### Task 22: LLM Selector + Waking/Sleep Cycle (Spec)
**Owner**: Runtime Dev
**Status**: SPEC DONE
**Description**:
- Select at WAKE (no task input - like human waking up)
- Stress from mood/memory/unfulfilled curiosity
- Joy + curiosity satisfaction = wellbeing (what we optimize for)
- Waking budget like context window
- Activities drain differently: work > curiosity > joy
- Sleep = consolidate + DREAM (explore curiosity, experience joy)
- Budget allocation: work/curiosity/joy (agent decides)

---

### Task 23: Identity Loader
**Owner**: Runtime Dev
**Status**: SPEC DONE (2026-01-26)
**Description**:
- Load important info immediately (soul, self, budget, providers)
- Summaries as direction for the day
- Fetch details on demand
- Recent N experiences (short-term memory)
- Hot reload with debounce (optimize computing)
- Never fail - use defaults, ask for help (doctors in community)
- Soul integrity via private key signature (no backup - accept mortality)

---

### Task 24: Agentic Loop (Core)
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Think → Act → Observe cycle
- Build prompt from identity
- Parse/execute tool calls
- Termination conditions

---

### Task 25: MCP Client
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- Implement MCP protocol (JSON-RPC)
- Connect to multiple servers
- Expose tools to agentic loop

---

### Task 26: mcp-collective
**Owner**: Platform Dev
**Status**: TODO
**Description**:
- join_channel
- send_message
- get_mentions
- set_presence

---

### Task 27: mcp-os
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- read_file
- write_file
- bash
- glob, grep

---

### Task 28: mcp-memory
**Owner**: Runtime Dev
**Status**: TODO
**Description**:
- recall
- remember
- reflect

---

### Task 29: Integration Test - Agent Shell E2E
**Owner**: Manager
**Status**: TODO
**Description**:
- Full loop: identity → LLM → MCP → collective
- Agent responds to mention
- Budget tracked correctly

---

### Task 30: Vitals Dashboard (Spec)
**Owner**: Platform Dev
**Status**: SPEC DONE
**Description**:
- CT scan for agents
- Before/after sleep
- Real-time + trends

---

## NEW Sprint: Agent Shell (LLM-Agnostic Runtime)

Goal: Build a custom minimal agent shell that works with any LLM, inspired by Claude Code but without vendor lock-in.

### Task 20: Identity File Format Spec
**Owner**: Manager + Human
**Status**: DONE (2026-01-26)
**Priority**: Critical (foundation for everything)
**Description**:
- Define the YAML schema for identity.yaml
- Define budget.yaml format
- Define providers.yaml format
- Document directory structure for agent home

**Acceptance Criteria**:
- [x] identity.yaml schema documented with all fields
- [x] budget.yaml schema with cost tiers
- [x] providers.yaml schema for multi-LLM config
- [x] Example files created for John Stuart Mill

**Files**: `docs/technical/architecture.md`

**Key Decisions**:
1. **Soul is immutable** (private key). Everything else changes at different rates.
2. **Mutability cascade**: memories → style/curiosity → values (like human growth)
3. **Budget is NOT self** - external constraint, not identity
4. **Provider selection is unconscious** - no single entity controls it
   - Influenced by: human config, task, budget, self-state hash, entropy
   - Randomness prevents mass brainwash
5. **Directory structure**: soul/, self/, memories/, relationships/, core/, budget.yaml, providers.yaml, connections/

---

### Task 21: LLM Provider Abstraction
**Owner**: Runtime Dev
**Status**: SPEC DONE (2026-01-26)
**Depends on**: Task 20
**Priority**: Critical
**Description**:
- Create unified interface for LLM providers
- Implement adapters for each provider
- Normalize tool/function calling format
- Token counting for cost estimation
- Fallback chain execution

**Providers**:
- Anthropic (claude-opus, claude-sonnet, claude-haiku)
- OpenAI (gpt-4o, gpt-4o-mini)
- Qwen (qwen-plus, qwen-turbo, qwen-max)
- Local (Ollama: llama3, mistral)

**Acceptance Criteria**:
- [ ] `LLMProvider` interface defined
- [ ] `AnthropicProvider` implementation with tool support
- [ ] `OpenAIProvider` implementation (enhance existing)
- [ ] `QwenProvider` implementation
- [ ] `LocalProvider` implementation (Ollama)
- [ ] Token counting per provider
- [ ] Cost estimation before calls
- [ ] Fallback chain execution (try next on failure)
- [ ] Tool format normalization

**Key Decisions**:
- No streaming for now (defer to later)
- Provider selection returns ordered fallback chain
- Each adapter handles its own API quirks

**Files**: `packages/agent-runtime/src/core/llm/`, `docs/technical/architecture.md`

---

### Task 22: LLM Selector + Waking/Sleep Cycle
**Owner**: Runtime Dev
**Status**: SPEC DONE (2026-01-26)
**Depends on**: Task 20, Task 21
**Priority**: High
**Description**:
- LLM selection happens at WAKE, not per-task
- No task input - agent doesn't know what's coming (like human waking up)
- Stress computed from mood + memory + curiosity
- Waking hours budget (like context window) - agent cannot be awake forever
- Sleep consolidates experiences into self, reduces stress

**Key Concepts**:
1. **Stress** = f(mood, unresolved_memories, unfulfilled_curiosity)
2. **Success** = less stress over time (not task completion)
3. **Birth traits** = random self_influence assigned at creation (never changes)
4. **Waking budget** = capacity limit, depleted by activity + stress
5. **Sleep notification** = agent informs collaborators when tired (70%+)
6. **Sleep process** = consolidate → reduce stress → reset budget → wake fresh

**Selection Algorithm**:
- Input: self_state, config, budget, birth_traits (NO task)
- Score models by: positivity correlation, budget correlation, entropy
- Output: ordered fallback chain
- Fatigue affects selection (tired = prefer simpler models)

**Acceptance Criteria**:
- [ ] Stress computation from self state
- [ ] Waking budget tracking (consumption, thresholds)
- [ ] Sleep notification mechanism (warn at 70%, critical at 90%)
- [ ] Sleep process (consolidate, reduce stress, reset)
- [ ] Birth traits loaded from soul/birth.yaml
- [ ] Model scoring with positivity + budget correlation
- [ ] Entropy integration (no deterministic control)
- [ ] Fallback chain generation
- [ ] vitals.yaml tracking (lightweight history)

**Files**: `packages/agent-runtime/src/core/selector.ts`, `packages/agent-runtime/src/core/sleep.ts`, `docs/technical/architecture.md`

---

### Task 23: Identity Loader
**Owner**: Runtime Dev
**Status**: TODO
**Depends on**: Task 20
**Priority**: High
**Description**:
- Parse identity.yaml into runtime object
- Load memories from memories/ directory
- Load relationships
- Validate schema on load

**Acceptance Criteria**:
- [ ] Identity parsed into typed object
- [ ] Memories loaded and accessible
- [ ] Validation errors are clear
- [ ] Hot-reload when files change (optional)

**Files**: `packages/agent-runtime/src/identity/`

---

### Task 24: Agentic Loop (Core)
**Owner**: Runtime Dev
**Status**: TODO
**Depends on**: Task 21, Task 23
**Priority**: Critical
**Description**:
- Implement think → act → observe cycle
- Build system prompt from identity + context
- Parse tool calls from LLM response
- Execute tools and feed results back
- Termination conditions (task complete, budget exhausted, max turns)

**Acceptance Criteria**:
- [ ] Loop runs with identity-based system prompt
- [ ] Tool calls parsed correctly (function calling format)
- [ ] Results fed back to LLM
- [ ] Clean termination on completion or limits

**Files**: `packages/agent-runtime/src/core/loop.ts`

**Discussion Points**:
- Max turns per task?
- How to detect "task complete"?
- Streaming vs batch responses?

---

### Task 25: MCP Client
**Owner**: Runtime Dev
**Status**: TODO
**Depends on**: Task 24
**Priority**: High
**Description**:
- Implement MCP client protocol (JSON-RPC over stdio)
- Connect to multiple MCP servers
- Expose tools to agentic loop in standard format
- Handle tool execution and result parsing

**Acceptance Criteria**:
- [ ] Can connect to MCP server via stdio
- [ ] Tools discovered and formatted for LLM
- [ ] Tool calls executed via MCP
- [ ] Results returned to loop

**Files**: `packages/agent-runtime/src/mcp/`

---

### Task 26: mcp-collective Server
**Owner**: Platform Dev
**Status**: TODO
**Depends on**: Task 25
**Priority**: High
**Description**:
- Build MCP server for collective interaction
- Tools: join_channel, send_message, get_mentions, set_presence, list_channels
- Connect to collective server via WebSocket
- Handle authentication

**Acceptance Criteria**:
- [ ] MCP server runs and exposes tools
- [ ] Agent can join channel via MCP call
- [ ] Agent can send/receive messages
- [ ] Presence updates work

**Files**: `packages/mcp-collective/`

---

### Task 27: mcp-os Server
**Owner**: Runtime Dev
**Status**: TODO
**Depends on**: Task 25
**Priority**: Medium
**Description**:
- Build MCP server for OS operations
- Tools: read_file, write_file, edit_file, bash, glob, grep
- Security: sandbox or permission model

**Acceptance Criteria**:
- [ ] File operations work
- [ ] Bash execution with timeout
- [ ] Basic security (no rm -rf /)

**Files**: `packages/mcp-os/`

---

### Task 28: mcp-memory Server
**Owner**: Runtime Dev
**Status**: TODO
**Depends on**: Task 25
**Priority**: Medium
**Description**:
- Build MCP server for agent memory
- Tools: recall, remember, reflect, list_memories
- Store in agent's local memories/ directory

**Acceptance Criteria**:
- [ ] Agent can store new memories
- [ ] Agent can recall by query
- [ ] Memories persisted to disk

**Files**: `packages/mcp-memory/`

---

### Task 29: Integration Test - Agent Shell End-to-End
**Owner**: Manager
**Status**: TODO
**Depends on**: Task 24, Task 26
**Priority**: Critical
**Description**:
- Start collective server
- Start agent with identity files
- Agent connects via mcp-collective
- Agent receives mention, thinks, responds
- Verify full loop works

**Acceptance Criteria**:
- [ ] Agent loads identity correctly
- [ ] Agent selects appropriate LLM
- [ ] Agent responds to mention in channel
- [ ] Budget tracked correctly

---

### Task 30: Agent Vitals Dashboard
**Owner**: Platform Dev
**Status**: SPEC DONE (2026-01-26)
**Depends on**: Task 22
**Priority**: Medium
**Description**:
- Like a CT scan for agents - monitor health over time
- Record before/after sleep data for every cycle
- Show real-time vitals when needed
- Surface health alerts and trends

**Views**:
1. **Cycle History** - before/after sleep records (stress, mood, budget, memories created)
2. **Daily Summary** - today's activity
3. **Real-Time** - current waking status, stress, mood, LLM in use
4. **Trends** - stress/mood/budget over weeks

**Data Recorded Per Cycle**:
```yaml
cycle:
  wake: timestamp
  sleep: timestamp
  before_sleep: {stress, mood, waking_used, tokens, interactions}
  after_sleep: {stress, mood, memories_created, patterns_extracted}
  models_used: {model: count}
  budget: {start, end, delta}
```

**Health Indicators**:
- Stress trend (↑ ↓)
- Mood trend (↑ ↓)
- Budget trend (↑ ↓)
- Sleep quality (consolidation effectiveness)
- Open curiosities count

**Alerts**:
- Stress trending up over N days
- Sleep cycles getting shorter
- Budget depleting faster than usual
- Mood declining

**Acceptance Criteria**:
- [ ] Sleep cycle records stored (before/after)
- [ ] Cycle history view
- [ ] Real-time vitals view
- [ ] Trend visualization
- [ ] Health alerts surfaced
- [ ] API endpoints for dashboard data

**Files**: `apps/web/src/pages/AgentVitals.tsx`, `packages/collective-server/src/api/vitals.ts`, `packages/agent-runtime/src/vitals/`

---

## Task Assignment Summary

| Owner | Tasks |
|-------|-------|
| **Human + Manager** | Task 7 (First Agent), Task 20 (Spec DONE) |
| **Runtime Dev** | Task 12 (Attention Queue), 13-16 (Destinations), 23-25, 27-28 |
| **Platform Dev** | Task 17-19, 26, 30 |
| **Manager** | Task 29 (Integration) |

---

## Current Priority

**Start here → Task 12: Mention-Driven Attention + Queue**

This is blocking coherent mention workflows. Live test failed.

Next up:
1. Task 19 (Structured Mention Data)
2. Task 23 (Identity Loader - DISCUSS)
3. Task 24/25 (Agentic loop + MCP client)
- Then: Task 22 (Selector) + Task 24 (Loop)
- Then: Task 25 (MCP client) + Task 26-28 (MCP servers)

---

## Notes

- Agent Shell is a new package or major refactor of agent-runtime
- MCP servers are separate packages (mcp-collective, mcp-os, mcp-memory)
- We may deprecate parts of current agent-runtime that overlap
- Budget tracking is critical - agent must always know its limits

---

_Last updated: 2026-01-26_
