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
│  Task 13: Destination Event Contract                 [REVIEW]   │
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
│  [REVIEW]                    │ │  [TODO]                      │
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
│  Abstraction                 │ │  [TODO]                      │
│  [SPEC DONE]                 │ │  Owner: Runtime Dev          │
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
│  [SPEC DONE]                 │              │
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
│  [SPEC DONE]                 │              │
│  Owner: Platform Dev         │              │
│  - CT scan for agents        │              │
│  - Before/after sleep        │              │
│  - Real-time + trends        │              │
└──────────────────────────────┘              │
          │                                   │
          └───────────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 24: Agentic Loop (Core)                        [TODO]     │
│  Owner: Runtime Dev                                             │
│  - Think → Act → Observe cycle                                  │
│  - Build prompt from identity                                   │
│  - Parse and execute tool calls                                 │
│  - Termination conditions                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Task 25: MCP Client                                 [TODO]     │
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
│  [TODO]          │ │  [TODO]          │ │  [TODO]          │
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

## Summary by Status

| Status | Tasks |
|--------|-------|
| **DONE** | 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 20 |
| **SPEC DONE** | 21, 22, 23, 30 |
| **REVIEW** | 13, 15, 17 |
| **READY** | 7 |
| **DISCUSS** | 24 |
| **TODO** | 12, 14, 16, 18, 19, 25, 26, 27, 28, 29 |

---

## Critical Path

```
Task 20 (Identity Spec)
    │
    ├──► Task 21 (LLM) ──► Task 22 (Selector) ──┐
    │                                           │
    └──► Task 23 (Loader) ──────────────────────┴──► Task 24 (Loop)
                                                          │
                                                          ▼
                                                    Task 25 (MCP)
                                                          │
                                                          ▼
                                                    Task 26 (collective)
                                                          │
                                                          ▼
                                                    Task 29 (E2E Test)
```

**Estimated tasks on critical path: 7**

---

_Last updated: 2026-01-26_
