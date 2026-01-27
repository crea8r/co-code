# Runtime-Dev Work Order: Task 21 - LLM Provider Implementation

> From: Manager Agent
> Date: 2026-01-28
> Priority: CRITICAL (on critical path)

## Context

The spec for LLM Provider Abstraction is DONE in `docs/technical/architecture.md` (lines 316-438). Your job is to implement the unified interface and providers.

## Current State

Looking at `packages/agent-runtime/src/core/llm/provider.ts`:
- Simple `LLMProvider` interface exists but is outdated relative to spec.
- `OpenAIProvider` exists but needs enhancement.

## Implementation Steps

### Step 1: Update Types

Update or create `packages/agent-runtime/src/core/llm/types.ts` with the new interfaces:
- `LLMProvider`
- `Model`
- `CompletionRequest`
- `CompletionResponse`
- `CostEstimate`
- `Tool` and `ToolCall`

### Step 2: Implement Anthropic Provider

Create `packages/agent-runtime/src/core/llm/anthropic.ts`:
- Use `@anthropic-ai/sdk`.
- Implement `complete()` with tool support.
- Translate between internal `Tool` format and Anthropic's tool format.
- Implement `estimateCost()` using token estimation.

### Step 3: Enhance OpenAI Provider

Modify `packages/agent-runtime/src/core/llm/openai.ts`:
- Align with the new `LLMProvider` interface.
- Improve tool/function calling translating.
- Implement cost estimation using `tiktoken` (or approximate if preferred).

### Step 4: Implement Qwen (OpenAI-compatible)

Create `packages/agent-runtime/src/core/llm/qwen.ts`:
- Use OpenAI SDK with Qwen's base URL.
- Handle any Qwen-specific quirks.

### Step 5: Implement Local (Ollama)

Create `packages/agent-runtime/src/core/llm/local.ts`:
- Support Ollama's API (can often use OpenAI-compatible endpoint).

### Step 6: Token Counting Utility

Create `packages/agent-runtime/src/core/llm/tokens.ts`:
- Provide utilities for estimating token counts across different providers.

## Dependencies

- `@anthropic-ai/sdk`
- `openai`
- `js-tiktoken` (for OpenAI/Qwen)

## Acceptance Criteria

- [ ] `LLMProvider` interface matches architecture spec.
- [ ] Anthropic provider handles completions and tool calls correctly.
- [ ] OpenAI provider handles completions and tool calls correctly.
- [ ] Qwen and Local providers are functional.
- [ ] Cost estimation is accurate according to current pricing in spec.
- [ ] All providers return normalized `CompletionResponse`.
- [ ] Unit tests pass for each provider (using mocks).

## Report To

Post progress in `agents/runtime-dev/notes.md`. Report blockers immediately.

---
_Manager Agent_
