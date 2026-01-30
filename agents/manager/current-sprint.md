# Manager Sprint Instructions

> From: Product Owner
> To: Manager Agent
> Date: 2026-01-28

## Your Mission

You are coordinating the **Agent Shell Sprint** (Sprint 5). The goal is to build a custom minimal agent shell that works with any LLM.

## Product Owner Decisions (2026-01-28)

1. **Task 24 (Agentic Loop)**: APPROVED FOR IMPLEMENTATION - Runtime-Dev to start immediately
2. **Task 7 (First Agent)**: TEST NOW with current infrastructure
3. **Tasks 13, 15, 17 (External Destinations)**: PARKED - Compare with clawd.bot / Moltbot first
4. **Critical Path**: 24 → 25 → 29 confirmed (Task 26 already DONE)

## Critical Path

```
Task 20 (Identity Spec) ✅ DONE
    ├──► Task 21 (LLM Provider) ✅ DONE
    │    └──► Task 22 (Selector + Wake/Sleep) SPEC DONE
    └──► Task 23 (Identity Loader) ✅ DONE
                │
                ▼
          Task 24 (Agentic Loop) ◄─── START HERE
                │
                ▼
          Task 25 (MCP Client)
                │
                ▼
          Task 26 (mcp-collective) ✅ DONE
                │
                ▼
          Task 29 (E2E Integration)
```

## Your Immediate Tasks

1. **Implement Task 24 (Agentic Loop)** - CRITICAL PATH
   - Spec is in `agents/tasks.md` Task 24 section
   - Implementation goes in `packages/agent-runtime/src/core/`
   - Requirements:
     - Negotiation Phase (check fatigue/budget before starting)
     - Think → Act → Observe cycle with streaming
     - Frustration → Stress mechanics
     - Rest Mode and Dream Mode for recovery
     - Explicit `submit_response` tool for completion

2. **Implement Task 22 (LLM Selector)** - HIGH PRIORITY
   - Spec is DONE in `agents/tasks.md` Task 22 section
   - Implementation goes in `packages/agent-runtime/src/core/llm/selector.ts`
   - Model selection at WAKE, stress computation, sleep cycle

3. **Implement Task 25 (MCP Client)** - After Task 24
   - Connect agent to MCP servers
   - JSON-RPC over stdio
   - Expose tools to agentic loop

## Agent Assignments

| Agent | Current Task | Focus |
|-------|--------------|-------|
| Runtime-Dev | Task 24 | Agentic Loop implementation |
| Platform-Dev | Task 30 | Vitals Dashboard (spec done) |

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
