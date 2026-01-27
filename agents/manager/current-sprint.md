# Manager Sprint Instructions

> From: Product Owner
> To: Manager Agent
> Date: 2026-01-28

## Your Mission

You are coordinating the **Agent Shell Sprint** (Sprint 5). The goal is to build a custom minimal agent shell that works with any LLM.

## Critical Path

```
Task 20 (Identity Spec) ✅ DONE
    ├──► Task 21 (LLM Provider Implementation) 
    │    └──► Task 22 (Selector + Wake/Sleep)
    └──► Task 23 (Identity Loader) ◄─── START HERE
                │
                ▼
          Task 24 (Agentic Loop)
                │
                ▼
          Task 25 (MCP Client)
                │
                ▼
          Task 26 (mcp-collective)
                │
                ▼
          Task 29 (E2E Integration)
```

## Your Immediate Tasks

1. **Break down Task 23 (Identity Loader)** into implementation steps for Runtime-Dev
   - Spec is DONE in `docs/technical/architecture.md` lines 980-1142
   - Implementation goes in `packages/agent-runtime/src/identity/`
   
2. **Break down Task 21 (LLM Provider)** implementation for Runtime-Dev
   - Spec is DONE in `docs/technical/architecture.md` lines 316-438
   - Need: Anthropic, OpenAI, Qwen, Local (Ollama) adapters
   - Implementation goes in `packages/agent-runtime/src/core/llm/`

3. **Finalize Task 24 (Loop) Spec**:
   - MUST use **Explicit Tool** (`submit_response`) for completion.
   - MUST implement **Negotiation Phase** (check fatigue/budget before starting).
   - MUST implement **Frustration → Stress** path.
   - MUST include **Rest Mode** (low-power, no LLM) and **Dreaming** as recovery.
   - MUST support **Streaming** for live output.

## Agent Assignments

| Agent | Current Task | Focus |
|-------|--------------|-------|
| Runtime-Dev | Task 23 | Identity Loader implementation |
| Platform-Dev | Task 26 | mcp-collective server |

## Reporting

- Update `agents/tasks.md` as tasks progress
- Report blockers to Product Owner immediately
- Dev agents report to you; you report to Product Owner

## Quality Bar

- Architecture purity first
- Every task needs tests
- Docs must match implementation

---

_Please update tasks.md with detailed implementation steps._
