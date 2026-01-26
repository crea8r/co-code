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
- Task 13 in progress: added destination event contract types and documented queue semantics.
- Task 13 done: added contract tests in shared package; `npm test` passes.
- Task 14 done: added destination adapter interface + mock adapter and tests; `npm test` passes in agent-runtime.
- Task 15 done (code + tests): Slack adapter added with ingest mapping, mention detection, and rate-limit retry logic; requires Socket Mode/Events API wiring + real tokens to validate against Slack.
- Task 16 done (code + tests): Telegram adapter added with update ingest mapping, mention detection, and rate-limit retry logic; real bot token + webhook/long-poll still needed for live verification.

---

## Questions for Manager
_List questions that need clarification_

---

## Blockers
_Issues preventing progress_

---

## Findings
_Important discoveries during development_
