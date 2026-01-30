# Runtime Dev Notes

_Task source of truth: `agents/manager/tasks.md`_

## Scratchpad
_Use this for working notes, questions, findings_

- 2026-01-25: Ran agent-runtime build and CLI init; created agent ID 4722f19a-fc5a-40c5-b257-8f032cc54fe4.
- Verified files under `~/.co-code/agents/4722f19a-fc5a-40c5-b257-8f032cc54fe4/` with `identity/private_key.json` and `memory/self.json` present and populated.
- Added `packages/agent-runtime/src/core/__tests__/memory.test.ts` covering MemoryStore and identity key helpers; `npm test` passes.
- Implemented OpenAI Responses provider and tested LLM call using `CHATGPT_API` (model `gpt-5`) with agent ID `4722f19a-fc5a-40c5-b257-8f032cc54fe4`; agent responded successfully.
- Updated CLI help/output to mention `CHATGPT_API` and added `--provider` flag to force OpenAI vs Anthropic.
- Ran agent start path smoke test using `CHATGPT_API` (OpenAI) and confirmed response output.
- Implemented mention events + attention state: shared types, server routing, runtime queue, and UI attention updates.
- Added manual test checklist and automated tests for OpenAI provider + collective connection mention/attention paths.
- Task 13: added destination event contract types and documented queue semantics. DONE.
- Task 14: added destination adapter interface + mock adapter and tests; `npm test` passes in agent-runtime. DONE.
- Task 15: Slack adapter added with ingest mapping, mention detention, and rate-limit retry logic. DONE.
- Task 16: Telegram adapter added with update ingest mapping, mention detection, and rate-limit retry logic. DONE.
- Task 24: Agentic loop started (negotiation + think/act/observe loop module added; wiring + tests in progress).
- 2026-01-30: Task 29 E2E attempt - server + agent start OK; WS auth OK. Blocked on agent not receiving mentions because it does not auto-join channels; mention events only route to connections in channel; "general" channel name invalid (UUID required).
- 2026-01-30: Task 22 follow-up - added optional vitals.yaml persistence + history, selector uses IdentityLoader state when agentPath provided, node runtime sends sleep status via onSleepWarning callback.
- Task 24: Agentic loop implemented and wired into Agent; tests added; `npm test` passes in agent-runtime. READY FOR REVIEW.
- Task 25: MCP client already present; verified core client + registry exist and tests pass.
- Task 22: Implemented wake selection, fatigue-aware scoring, stress computation helper, and sleep threshold warnings; added tests; `npm test` passes.
- Task 27: Added mcp-os package with read/write/edit/bash/glob/grep tools and helper tests; `npm test -w @co-code/mcp-os` passes.
- Task 28: Added mcp-memory package with recall/remember/reflect tools and file-backed store; `npm test -w @co-code/mcp-memory` passes.
- Task 29 (E2E) attempt: server + agent start OK, WS auth OK. Blocked on agent not receiving mentions because it does not auto-join channels; mention events only sent to connections that have joined channel. Also attempted channelId \"general\" fails (server expects UUID). Needs join_channel via MCP or runtime auto-join before E2E can pass.
- 2026-01-28: Task 23 DONE - Identity Loader tests completed
  - Created comprehensive test suite: `packages/agent-runtime/src/identity/__tests__/loader.test.ts`
  - 13 tests covering: valid files, missing files (defaults), invalid YAML, hot reload, soul integrity, nested defaults, experiences loading, error reporting
  - All tests passing ✅
- 2026-01-28: Task 21 DONE - LLM Provider Implementation
  - Implemented unified interface in `provider.ts`.
  - Created `AnthropicProvider`, `OpenAIProvider`, `QwenProvider`, `LocalProvider`.
  - Added token counting utility in `tokens.ts`.
  - Updated `Agent`, `MemoryConsolidator`, and `CuriosityExplorer` to use new interface.
  - All tests passing including updated `openai.test.ts` ✅
- 2026-01-28: Task 25 ASSIGNED - MCP Client
  - Work order created: `agents/runtime-dev/task-25-mcp-client.md`
  - Goal: Connect agent to MCP servers (mcp-collective, etc.).

---

## Questions for Manager
_List questions that need clarification_

---

## Blockers
_Issues preventing progress_

---

## Findings
_Important discoveries during development_
