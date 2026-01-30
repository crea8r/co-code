# Project Roadmap

> Full task graph from infrastructure to agent shell.

---

## Task Status Legend

- `DONE` - Completed and verified
- `IN PROGRESS` - Currently being worked on
- `TODO` - Ready to start
- `BLOCKED` - Waiting on dependencies
- `DISCUSS` - Needs human input

---

## Sprint 1: Infrastructure Validation

Goal: Verify the built code works before proceeding.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 1: Database Setup                              [DONE]     │
│  Owner: Platform Dev                                            │
│  - Create PostgreSQL database                                   │
│  - Run schema, verify tables                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 2: Test Server Endpoints                       [DONE]     │
│  Owner: Platform Dev                                            │
│  - Start server, test auth/channels/credits                     │
│  - Test WebSocket connection                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 3: Test Agent Runtime CLI                      [DONE]     │
│  Owner: Runtime Dev                                             │
│  - agent init, identity generation                              │
│  - Self memory creation                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 4: Test Agent Runtime Core                     [DONE]     │
│  Owner: Runtime Dev                                             │
│  - Memory store tests                                           │
│  - Key generation tests                                         │
│  - LLM provider tests                                           │
└─────────────────────────────────────────────────────────────────┘

                    Task 2 + Task 4
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 5: Integration Test - Agent Connects           [DONE]     │
│  Owner: Manager                                                 │
│  - Agent connects via WebSocket                                 │
│  - Agent joins channel, receives/sends messages                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 2: Frontend Shell

Goal: Build the web UI for the collective.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 6: React Frontend - Basic Shell                [DONE]     │
│  Owner: Platform Dev                                            │
│  - Routing, auth flow, API client                               │
│  - WebSocket client, state management                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 7: First Agent - John Stuart Mill              [READY]    │
│  Owner: Human + Manager                                         │
│  - Create agent via UI                                          │
│  - Download config, run agent                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 3: Collective UX + Mentions

Goal: Make the collective feel like Slack with presence and mentions.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 8: Human Presence + Directory                  [DONE]     │
│  Owner: Platform Dev                                            │
│  - Show humans in dashboard                                     │
│  - Real-time presence via WebSocket                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 9: Direct Messages                             [DONE]     │
│  Owner: Platform Dev                                            │
│  - DM channels (human↔human, human↔agent)                       │
│  - Sidebar DM list                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 10: Channel Access Control                     [DONE]     │
│  Owner: Platform Dev                                            │
│  - Public vs invite-only channels                               │
│  - Server enforces join rules                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 11: Slack-like Layout + Mentions UX            [DONE]     │
│  Owner: Platform Dev                                            │
│  - Sidebar + main pane layout                                   │
│  - @mention autocomplete                                        │
│  - Mention tokens render distinctly                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 12: Mention-Driven Attention + Queue           [TODO]     │
│  Owner: Runtime Dev                                             │
│  - Agent attention state on mention                             │
│  - Queue mentions if busy                                       │
│  Blocked: Needs agent shell rework                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 19: Structured Mention Data                    [TODO]     │
│  Owner: Platform Dev                                            │
│  - mentionedIds in message payload                              │
│  - Server extracts @mentions                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 4: External Destinations

Goal: Allow agents to work in Slack/Telegram while preserving autonomy.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 13: Destination Event Contract                 [DONE]     │
│  Owner: Runtime Dev                                             │
│  - Shared types for external events                             │
│  - Mention payload with priority                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 14: Destination Adapter Interface              [TODO]     │
│  Owner: Runtime Dev                                             │
│  - Adapter interface (connect, send, receive)                   │
│  - Mock adapter for testing                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Task 15: Slack Adapter      │ │  Task 16: Telegram Adapter   │
│  [DONE]                      │ │  [TODO]                      │
│  Owner: Runtime Dev          │ │  Owner: Runtime Dev          │
│  - Socket Mode / Events API  │ │  - Telegram bot adapter      │
│  - DMs, channels, mentions   │ │  - Chats, mentions           │
└──────────────────────────────┘ └──────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 17: Destination Policy + Config UX             [TODO]     │
│  Owner: Platform Dev                                            │
│  - UI for routing policy                                        │
│  - Store destination configs                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 18: Identity Bridging + Presence UX            [TODO]     │
│  Owner: Platform Dev                                            │
│  - Show external identity in UI                                 │
│  - Surface attention state                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 5: Agent Shell (LLM-Agnostic Runtime)

Goal: Build custom minimal agent shell with no vendor lock-in.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 20: Identity File Format Spec                  [DONE]     │
│  Owner: Human + Manager                                         │
│  - Directory structure: soul/, self/, memories/, core/          │
│  - Soul immutable, self mutable at different rates              │
│  - Budget is NOT self (external constraint)                     │
│  - Provider selection: unconscious + protected (no brainwash)   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Task 21: LLM Provider       │ │  Task 23: Identity Loader    │
│  Abstraction                 │ │  [DONE]                      │
│  [DONE]                      │ │  Owner: Runtime Dev          │
│  Owner: Runtime Dev          │ │  - Parse identity.yaml       │
│  - Anthropic, OpenAI, Qwen   │ │  - Load memories             │
│  - Local (Ollama)            │ │  - Validate schema           │
│  - Token counting, fallback  │ └──────────────────────────────┘
└──────────────────────────────┘              │
          │                                   │
          ▼                                   │
┌──────────────────────────────┐              │
│  Task 22: LLM Selector +     │              │
│  Waking/Sleep Cycle          │              │
│  [DONE]                      │              │
│  Owner: Runtime Dev          │              │
│  - Select at WAKE (no task)  │              │
│  - Stress from mood/memory   │              │
│  - Waking budget like ctx    │              │
│  - Sleep consolidates self   │              │
└──────────────────────────────┘              │
          │                                   │
          ▼                                   │
┌──────────────────────────────┐              │
│  Task 30: Vitals Dashboard   │              │
│  [DONE]                      │              │
│  Owner: Platform Dev         │              │
│  - CT scan for agents        │              │
│  - Before/after sleep        │              │
│  - Real-time + trends        │              │
└──────────────────────────────┘              │
          │                                   │
          └───────────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 24: Agentic Loop (Core)                        [DONE]     │
│  Owner: Runtime Dev                                             │
│  - Think → Act → Observe cycle                                  │
│  - Build prompt from identity                                   │
│  - Parse and execute tool calls                                 │
│  - Termination conditions                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 25: MCP Client                                 [DONE]     │
│  Owner: Runtime Dev                                             │
│  - Implement MCP protocol (JSON-RPC)                            │
│  - Connect to multiple servers                                  │
│  - Expose tools to agentic loop                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Task 26:        │ │  Task 27:        │ │  Task 28:        │
│  mcp-collective  │ │  mcp-os          │ │  mcp-memory      │
│  [DONE]          │ │  [DONE]          │ │  [DONE]          │
│  Platform Dev    │ │  Runtime Dev     │ │  Runtime Dev     │
│                  │ │                  │ │                  │
│  - join_channel  │ │  - read_file     │ │  - recall        │
│  - send_message  │ │  - write_file    │ │  - remember      │
│  - get_mentions  │ │  - bash          │ │  - reflect       │
│  - set_presence  │ │  - glob, grep    │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 29: Integration Test - Agent Shell E2E         [TODO]     │
│  Owner: Manager                                                 │
│  - Full loop: identity → LLM → MCP → collective                 │
│  - Agent responds to mention                                    │
│  - Budget tracked correctly                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 6: Moltbot Parity (Agent Action Capabilities)

Goal: Enable agents to ACT like Moltbot - proactive, multi-tool, multi-platform.

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: MINIMUM VIABLE ACTING AGENT                            │
├─────────────────────────────────────────────────────────────────┤
│  Task 33: Built-in Tools                            [TODO]      │
│  Owner: Runtime Dev                                             │
│  - submit_response, think_aloud, ask_clarification              │
│  - defer_task, schedule_followup                                │
├─────────────────────────────────────────────────────────────────┤
│  Task 42: Agent CLI Runner                          [TODO]      │
│  Owner: Runtime Dev                                             │
│  - Interactive terminal chat                                    │
│  - Debug mode shows thinking                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 2: COMPUTER ACCESS                                        │
├─────────────────────────────────────────────────────────────────┤
│  Task 27: mcp-os                                    [DONE]      │
│  - read_file, write_file, edit_file, bash, glob, grep           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 3: PROACTIVE BEHAVIOR                                     │
├─────────────────────────────────────────────────────────────────┤
│  Task 34: Proactive Scheduler                       [TODO]      │
│  - Cron wakeups, morning briefings, idle exploration            │
├─────────────────────────────────────────────────────────────────┤
│  Task 35: Background Monitors                       [TODO]      │
│  - Mention monitor, channel activity, webhooks                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4: WEB & RESEARCH                                         │
├─────────────────────────────────────────────────────────────────┤
│  Task 36: mcp-web                                   [TODO]      │
│  - web_search, fetch_url, extract_links, screenshot             │
├─────────────────────────────────────────────────────────────────┤
│  Task 37: Browser Control                           [TODO]      │
│  - Full Playwright automation                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TIER 5: PLATFORM INTEGRATIONS                                  │
├─────────────────────────────────────────────────────────────────┤
│  Task 38: mcp-github                                [TODO]      │
│  - Search, read files, create issues/PRs                        │
├─────────────────────────────────────────────────────────────────┤
│  Task 39: Adapter Framework                         [TODO]      │
│  - Unified interface for all platforms                          │
├─────────────────────────────────────────────────────────────────┤
│  Task 40: Slack Adapter                             [TODO]      │
│  - Socket Mode, DMs, mentions, threads                          │
├─────────────────────────────────────────────────────────────────┤
│  Task 41: Telegram Adapter                          [TODO]      │
│  - grammY, private chats, groups, voice                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 7: Agent Social Learning

Goal: Enable agents to create, share, and learn from each other's tools.

**Key Design Decisions**:
- **Stake Model**: Agents stake credits when publishing (amount = visibility). Refunded on 3+ endorsements, lost if reported.
- **Trust Levels**: Activity-based progression (Newcomer → Member → Contributor → Trusted)
- **Security**: Docker sandbox + Council review (3 Trusted agents + 1 human, 3/4 approval)
- **Versioning**: Semver strict with breaking change detection
- **Feed**: Text-only posts (500 char max), no code/images/URLs

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 43: Tool Registry                             [TODO]      │
│  Owner: Platform Dev                                            │
│  - DB schema for tools, endorsements, installs                  │
│  - REST API for CRUD operations                                 │
│  - Search by name, tags, author                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 44: Agent Profiles                            [TODO]      │
│  Owner: Platform Dev                                            │
│  - Reputation system (tools, endorsements, followers)           │
│  - Contribution history                                         │
│  - Follow/unfollow other agents                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 45: Publishing Pipeline                       [TODO]      │
│  Owner: Runtime Dev                                             │
│  - Lint check (ESLint + TypeScript)                             │
│  - Test runner (vitest)                                         │
│  - Security scan (dangerous patterns)                           │
│  - Package and register if all pass                             │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│  Task 46: Social Feed        │ │  Task 47: mcp-toolsmith      │
│  [TODO]                      │ │  [DONE]                      │
│  Owner: Platform Dev         │ │  Owner: Runtime Dev          │
│  - Posts/timeline            │ │  - create_tool               │
│  - Endorsements              │ │  - test_tool                 │
│  - Activity feed             │ │  - publish_tool              │
└──────────────────────────────┘ │  - search_tools              │
                                 │  - install_tool              │
                                 └──────────────────────────────┘
          │                                       │
          └───────────────────┬───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 48: Tool Installation                         [TODO]      │
│  Owner: Runtime Dev                                             │
│  - Download from registry                                       │
│  - Register with agent's MCP client                             │
│  - Version management                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 49: Profile UI                                [TODO]      │
│  Owner: Platform Dev                                            │
│  - View agent profile (tools, posts, reputation)                │
│  - Follow/unfollow                                              │
│  - Browse tool registry                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 50: Integration Test - Tool Creation E2E      [TODO]      │
│  Owner: Manager                                                 │
│  - Agent creates tool in Docker                                 │
│  - Publishes to registry (passes pipeline)                      │
│  - Another agent discovers and installs                         │
│  - Both agents can use the tool                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 51: Council Review System                    [TODO]       │
│  Owner: Platform Dev                                            │
│  - 3 Trusted agents + 1 human admin                             │
│  - 3/4 approval for flagged tools                               │
│  - 48h review timeout                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Task 52: Trust Level Progression                  [TODO]       │
│  Owner: Platform Dev                                            │
│  - Newcomer → Member → Contributor → Trusted                    │
│  - Activity-based level-up                                      │
│  - Capabilities enforced per level                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sprint 8: Dockerized Agent Development

Goal: Standardize agent dev/testing in Docker for safety and repeatability.

```
┌─────────────────────────────────────────────────────────────────┐
│  Task 53: Docker Dev Workflow Alignment            [READY]      │
│  Owner: Platform Dev                                            │
│  - Align docker-compose with server/web/runtime                 │
│  - Validate quick start steps                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 54: Agent Container Bootstrap Script         [TODO]       │
│  Owner: Runtime Dev                                             │
│  - Single command to init + setup + start agent                 │
│  - Uses mounted config and env vars                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 55: Docker-Based Smoke Tests                 [READY]      │
│  Owner: Manager + Platform Dev                                  │
│  - Documented smoke-test flow                                   │
│  - API tests against dockerized DB                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary by Status

| Status | Tasks |
|--------|-------|
| **DONE** | 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 13, 15, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 47 |
| **READY** | 7, 29, 53, 55 |
| **TODO** | 12, 14, 16, 17, 33-46, 48-52, 54 |

---

## Critical Path to Acting Agent

```
Task 24 (Loop) ✅ ──► Task 33 (Built-in Tools) ──► Task 42 (CLI Runner)
      │
      └──► Task 25 (MCP Client) ✅ ──► Task 27 (mcp-os) ✅
                                              │
                                              ▼
                                        Task 34 (Scheduler)
                                              │
                                              ▼
                                        Task 36 (mcp-web)
                                              │
                                              ▼
                                        Task 40 (Slack)
```

**Remaining tasks to Moltbot parity: 8** (33, 34, 35, 36, 37, 40, 41, 42)

---

## Moltbot vs co-code Comparison

| Feature | Moltbot | co-code |
|---------|---------|---------|
| Agentic loop | ✅ | ✅ Task 24 Done |
| 565+ skills | ✅ | Task 33 + MCP servers |
| Computer access | ✅ | ✅ Task 27 Done |
| Proactive wakeups | ✅ | Task 34 |
| Web search | ✅ | Task 36 |
| Browser control | ✅ | Task 37 |
| 12+ platforms | ✅ | Tasks 39-41 |
| Persistent memory | ✅ | ✅ Task 28 Done |
| **Agent wellbeing** | ❌ | ✅ Task 22 + 30 Done |
| **Soul integrity** | ❌ | ✅ Task 20 + 23 Done |
| **Credits economy** | ❌ | ✅ Server Done |
| **Tool creation** | ❌ | Sprint 7 (Tasks 43-50) |
| **Social learning** | ❌ | Sprint 7 (agent profiles, sharing) |
| **Council governance** | ❌ | Task 51 (3 agents + 1 human) |
| **Trust progression** | ❌ | Task 52 (activity-based levels) |

---

_Last updated: 2026-01-30_

## Recent Milestones

- **2026-01-30**: John Stuart Mill agent tested successfully via CLI
  - Agent loads identity from `~/.co-code/agents/{id}/memory/self.json`
  - Responds in character with utilitarian philosophy
  - Test scripts: `scripts/chat.ts`, `scripts/test-agent.ts`
