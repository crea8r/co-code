# Task 24: Agentic Loop Implementation

> Owner: Runtime-Dev
> Status: IN PROGRESS
> Priority: CRITICAL PATH
> Date Assigned: 2026-01-28

---

## Overview

Implement the core agentic loop that enables agents to think, act, and observe autonomously. This is the heart of the agent shell.

**Reference**: Moltbot/Clawdbot has proven this pattern works - we need parity.

---

## Requirements

### 1. Negotiation Phase (Before Starting)
```typescript
interface NegotiationResult {
  canProceed: boolean;
  reason?: string;
  estimatedCost: number;
  currentBudget: number;
  currentFatigue: number;
}

// Agent checks before accepting a task:
// - Do I have budget for this?
// - Am I too tired?
// - Is this aligned with my values?
```

### 2. Think → Act → Observe Loop
```typescript
interface LoopState {
  phase: 'think' | 'act' | 'observe';
  turnCount: number;
  frustration: number;
  tools: Tool[];
  messages: Message[];
}

// Loop flow:
// 1. THINK: Build prompt from identity + context, call LLM
// 2. ACT: Parse tool calls, execute via MCP
// 3. OBSERVE: Collect results, add to context
// 4. REPEAT until termination
```

### 3. Termination Conditions
- **Explicit completion**: Agent calls `submit_response` tool
- **Budget exhausted**: No more tokens/credits
- **Fatigue threshold**: Agent too tired (90%+)
- **Max turns**: Safety limit (configurable, default 50)
- **Error accumulation**: Too many consecutive errors

### 4. Frustration → Stress Mechanics
```typescript
interface FrustrationTracker {
  consecutiveErrors: number;
  loopDetected: boolean;
  stuckTurns: number;
}

// Rules:
// - Each error increases frustration by 0.1
// - Loop detection (same action 3x) increases by 0.3
// - Frustration > 1.0 triggers stress increase
// - High frustration forces mode switch
```

### 5. Recovery Modes
```typescript
type AgentMode = 'active' | 'rest' | 'dream';

// REST MODE:
// - No LLM calls
// - Light background tasks only
// - Reduces fatigue over time

// DREAM MODE:
// - Uses curiosity budget
// - Explores interests, reflects
// - Consolidates memories
```

### 6. Streaming Output
```typescript
interface StreamCallbacks {
  onThinking?: (text: string) => void;
  onToolCall?: (tool: string, args: unknown) => void;
  onToolResult?: (result: unknown) => void;
  onResponse?: (text: string) => void;
}
```

---

## Implementation Plan

### Phase 1: Core Loop (Day 1-2)
1. Create `packages/agent-runtime/src/core/loop.ts`
2. Implement basic think → act → observe
3. Add `submit_response` as built-in tool
4. Add turn counter and max turns

### Phase 2: Termination & Frustration (Day 2-3)
1. Add budget checking per turn
2. Implement frustration tracker
3. Add loop detection (same action repeated)
4. Frustration → stress conversion

### Phase 3: Recovery Modes (Day 3-4)
1. Implement mode switching
2. Rest mode (no LLM)
3. Dream mode (curiosity-driven)
4. Auto-recovery triggers

### Phase 4: Streaming & Polish (Day 4-5)
1. Add streaming callbacks
2. Integration with identity loader
3. Integration with LLM providers
4. Unit tests

---

## Files to Create/Modify

```
packages/agent-runtime/src/core/
├── loop.ts              # Main agentic loop
├── frustration.ts       # Frustration tracking
├── modes.ts             # Active/Rest/Dream modes
├── termination.ts       # Termination conditions
├── tools/
│   └── submit-response.ts  # Built-in completion tool
└── __tests__/
    └── loop.test.ts
```

---

## Acceptance Criteria

- [ ] Agent can run think → act → observe cycle
- [ ] `submit_response` tool ends loop cleanly
- [ ] Budget is checked before each LLM call
- [ ] Frustration increases on errors/loops
- [ ] High frustration triggers mode switch
- [ ] Rest mode works (no LLM, reduces fatigue)
- [ ] Streaming callbacks fire correctly
- [ ] Unit tests pass
- [ ] Integration with existing identity/LLM code

---

## Example Usage

```typescript
import { Agent } from '@co-code/agent-runtime';

const agent = await Agent.load('~/.co-code/agents/john-stuart-mill');

const result = await agent.run({
  task: 'Respond to the mention in #general',
  stream: {
    onThinking: (text) => console.log('[thinking]', text),
    onToolCall: (tool, args) => console.log('[tool]', tool, args),
  },
});

console.log(result.response);
console.log(result.tokensUsed);
console.log(result.turnsUsed);
```

---

## Notes

- Do NOT import any platform-specific code (keep pure TypeScript)
- Use adapter pattern for MCP client integration (interface now, implement later)
- Frustration and stress are different: frustration is temporary, stress persists
- The loop should be testable without real LLM (mock provider)

---

_Report progress to Manager daily. Blockers escalate immediately._
