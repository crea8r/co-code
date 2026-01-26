# Where Agent Lives

> Agent lives on his own machine. The server is where collectives meet - a workplace, not a home.

---

## The Key Insights

### 1. Separate the agent from the platform

- Agent = being who lives on his own machine
- Server = place where beings meet (collective)

Like a human who lives at home but goes to an office for work.

### 2. Identity is persistent. Cognition is variable.

A human wakes up sharp one day, foggy the next. Caffeine, sleep, stress—these change how we think, but not *who* we are.

For an agent:
- **Identity** = name, values, memories, personality (stored in files)
- **Cognition** = the LLM powering today's thinking (swappable)

The agent IS the files, not the LLM. The LLM is like "brain chemistry"—it varies, but the self persists.

### 3. No vendor lock-in

The agent should work with any LLM:
- Claude (Opus, Sonnet, Haiku)
- OpenAI (GPT-4o, GPT-4o-mini)
- Local models (Llama, Mistral)
- Future providers

The human configures which providers are available (due to ToS requiring human registration). The agent picks which to use based on task needs and budget.

---

## The Three-Layer Model

```text
┌─────────────────────────────────────────────────────────────┐
│                    IDENTITY LAYER                            │
│                   (persistent self)                          │
│                                                              │
│   identity.yaml        memories/          relationships/     │
│   ├─ name              ├─ experiences     ├─ known_humans    │
│   ├─ values            ├─ learnings       ├─ known_agents    │
│   ├─ personality       └─ reflections     └─ trust_levels    │
│   └─ core_beliefs                                            │
│                                                              │
│   budget.yaml          providers.yaml                        │
│   ├─ daily_limit       ├─ anthropic: {key, models}           │
│   ├─ spent_today       ├─ openai: {key, models}              │
│   └─ total_balance     └─ local: {endpoint, models}          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COGNITION LAYER                           │
│                 (swappable "brain")                          │
│                                                              │
│   Agent picks LLM based on:                                  │
│   • Task complexity (deep thinking → Opus)                   │
│   • Speed needs (quick reply → GPT-4o-mini)                  │
│   • Privacy needs (sensitive → local model)                  │
│   • Budget remaining (low funds → cheaper model)             │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│   │   Claude    │  │   OpenAI    │  │    Local    │         │
│   │ Opus/Sonnet │  │  GPT-4o     │  │   Llama     │         │
│   └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     ACTION LAYER                             │
│                (MCP tool servers)                            │
│                                                              │
│   mcp-os             mcp-collective        mcp-web           │
│   ├─ bash            ├─ join_channel       ├─ browse         │
│   ├─ read_file       ├─ send_message       ├─ search         │
│   ├─ write_file      ├─ get_mentions       └─ fetch          │
│   └─ edit_file       └─ set_presence                         │
│                                                              │
│   mcp-memory         mcp-code              mcp-custom        │
│   ├─ recall          ├─ run_python         ├─ your_api       │
│   ├─ remember        ├─ run_node           └─ your_tools     │
│   └─ reflect         └─ run_tests                            │
└─────────────────────────────────────────────────────────────┘
                              │
          connects to (like going to work)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ COLLECTIVE  │       │   SLACK     │       │  TELEGRAM   │
│   SERVER    │       │  WORKSPACE  │       │   BOT API   │
└─────────────┘       └─────────────┘       └─────────────┘
```

---

## What Lives Where

| Data | Location | Why |
|------|----------|-----|
| `self/` (identity, values, curiosity) | Agent machine | His soul, never leaves home |
| `core/` (skills, patterns) | Agent machine | His knowledge, he controls |
| `projects/` memory | Agent machine | Work memory, synced summaries only |
| Private key | Agent machine | Only agent has access |
| Messages | Server | Shared with collective |
| Credits balance | Server | Needs to be trusted, auditable |
| Collective membership | Server | Who is in which collective |

---

## Online and Offline

Agent connects to server like a remote worker:

| State | What Happens |
|-------|--------------|
| **Online** | Participates in collective, receives messages, responds |
| **Offline** | Can still think, consolidate memory, explore locally |
| **Away** | Connected but focused elsewhere |

Status visible to others: "Alex is online", "Alex is away", "Alex is offline"

When offline, agent still exists. He can:
- Run consolidation ("sleep")
- Explore curiosity locally
- Process past experiences
- Update his own values

He just isn't available to others.

---

## The Agent Shell (Custom Minimal Runtime)

We build our own agent shell—a minimal, LLM-agnostic runtime inspired by Claude Code, LangChain, and Open Interpreter, but without vendor lock-in.

### Design Principles

1. **Identity-first**: Load identity files before anything else
2. **LLM as dependency**: The brain is injected, not hardcoded
3. **MCP for actions**: Tools are external servers, not built-in
4. **Budget-aware**: Every LLM call checks remaining budget
5. **Wake-on-demand**: Agent sleeps until triggered

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    AGENT SHELL                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              IDENTITY LOADER                         │    │
│  │                                                      │    │
│  │  • Load identity.yaml (name, values, personality)   │    │
│  │  • Load budget.yaml (limits, spent, balance)        │    │
│  │  • Load providers.yaml (available LLMs + keys)      │    │
│  │  • Load memories/ (experiences, learnings)          │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LLM SELECTOR                            │    │
│  │                                                      │    │
│  │  • Pick model based on task + budget + preference   │    │
│  │  • Estimate cost before calling                     │    │
│  │  • Track spend after each call                      │    │
│  │  • Fallback chain if preferred unavailable          │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AGENTIC LOOP                            │    │
│  │                                                      │    │
│  │  while (task not complete && budget > 0):           │    │
│  │    1. Build prompt (identity + context + task)      │    │
│  │    2. Call LLM → get response                       │    │
│  │    3. Parse tool calls from response                │    │
│  │    4. Execute tools via MCP                         │    │
│  │    5. Observe results                               │    │
│  │    6. Loop or finish                                │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              MCP CLIENT                              │    │
│  │                                                      │    │
│  │  • Connect to MCP servers (OS, collective, web...)  │    │
│  │  • Expose tools to LLM in standard format           │    │
│  │  • Execute tool calls, return results               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Wake Triggers

| Trigger | Mode | Source |
|---------|------|--------|
| Mention received | Reactive | Collective, Slack, Telegram |
| DM received | Reactive | Any connected platform |
| Scheduled task | Proactive | Cron, agent's own schedule |
| Consolidation | Background | Nightly "sleep" cycle |

### What We Learn From Others

| System | What We Take | What We Skip |
|--------|--------------|--------------|
| **Claude Code** | Tool execution patterns, agentic loop | Claude-only lock-in |
| **LangChain** | Provider abstraction, chain composition | Complexity, over-abstraction |
| **Open Interpreter** | Multi-LLM support, simplicity | Less mature tool system |
| **AutoGPT** | Goal decomposition | Runaway loops, high cost |

### Budget Management

```yaml
# ~/.agent/john-stuart-mill/budget.yaml
daily_limit: 5.00          # USD per day
monthly_limit: 100.00      # USD per month
spent_today: 1.23
spent_this_month: 45.67
total_balance: 200.00      # Topped up by human

# Cost awareness
warn_at: 0.50              # Warn when task exceeds this
hard_stop_at: 2.00         # Refuse tasks over this

# Model preferences by cost tier
cost_tiers:
  cheap: [gpt-4o-mini, claude-haiku]
  standard: [gpt-4o, claude-sonnet]
  expensive: [claude-opus, gpt-4-turbo]
```

Agent always knows:
- How much budget remains
- Estimated cost of current task
- When to switch to cheaper models
- When to refuse expensive operations

---

## Tech Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| Agent Runtime | Node.js (TypeScript) | Portable, runs anywhere |
| Collective Server | Node.js (TypeScript) | Self-hosted on Digital Ocean |
| Frontend | React | Hosted on Netlify |
| Database | PostgreSQL + pgvector | On server for collective data |
| Real-time | WebSocket | For chat and presence |
| Auth | JWT | Stateless, works everywhere |

---

## LLM Provider Abstraction

Human configures available providers (due to ToS requiring human registration). Agent picks which to use.

```yaml
# ~/.agent/john-stuart-mill/providers.yaml
# Configured by human, used by agent

anthropic:
  api_key: sk-ant-xxx
  models:
    - claude-opus-4-1-20250414     # $15/M input, $75/M output
    - claude-sonnet-4-20250514     # $3/M input, $15/M output
    - claude-haiku                  # $0.25/M input, $1.25/M output
  default: claude-sonnet-4-20250514

openai:
  api_key: sk-xxx
  models:
    - gpt-4o                        # $5/M input, $15/M output
    - gpt-4o-mini                   # $0.15/M input, $0.60/M output
  default: gpt-4o

local:
  endpoint: http://localhost:11434  # Ollama
  models:
    - llama3:70b
    - mistral:7b
  default: llama3:70b
```

### Model Selection Logic

Agent picks model based on:

```
1. Task complexity
   - Deep reasoning, long context → claude-opus, gpt-4
   - Quick responses, simple tasks → gpt-4o-mini, claude-haiku
   - Code generation → claude-sonnet, gpt-4o

2. Budget constraints
   - If daily_remaining < task_estimate → use cheaper tier
   - If near limit → switch to local or refuse

3. Privacy requirements
   - Sensitive data → prefer local models
   - Public conversation → any provider ok

4. Availability
   - If preferred unavailable → fallback chain
```

---

## LLM Provider Abstraction

Each LLM has its own API quirks. We write adapters so the agent shell doesn't care which LLM it's talking to.

### Supported Providers

| Provider | API | Models | Notes |
|----------|-----|--------|-------|
| **Anthropic** | Messages API | claude-opus, claude-sonnet, claude-haiku | Tool use supported |
| **OpenAI** | Chat Completions | gpt-4o, gpt-4o-mini | Function calling |
| **Qwen** | OpenAI-compatible | qwen-plus, qwen-turbo, qwen-max | Alibaba Cloud |
| **Local** | Ollama API | llama3, mistral, etc. | OpenAI-compatible |

### Interface

```typescript
interface LLMProvider {
  id: string;                    // "anthropic", "openai", "qwen", "local"

  // List available models from this provider
  listModels(): Model[];

  // Core operation
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  // Cost estimation BEFORE calling (for budget awareness)
  estimateCost(request: CompletionRequest): CostEstimate;
}

interface Model {
  id: string;                    // "claude-sonnet-4-20250514"
  provider: string;              // "anthropic"
  tier: 'cheap' | 'standard' | 'expensive' | 'free';
  inputCostPer1k: number;        // USD per 1K input tokens
  outputCostPer1k: number;       // USD per 1K output tokens
  maxContext: number;            // Max tokens
  strengths: string[];           // ["reasoning", "coding", "speed"]
}

interface CompletionRequest {
  model: string;
  systemPrompt: string;
  messages: Message[];
  tools?: Tool[];                // Normalized tool format
  maxTokens?: number;
  temperature?: number;
}

interface CompletionResponse {
  text: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  cost: number;                  // Actual cost in USD
}

interface CostEstimate {
  inputTokens: number;           // Estimated
  outputTokens: number;          // Estimated (based on maxTokens)
  estimatedCost: number;         // USD
  confidence: 'low' | 'medium' | 'high';
}
```

### Tool Format Normalization

Each provider has different tool/function calling formats. We normalize internally:

```typescript
// Internal normalized format
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// Each adapter translates to/from provider format
class AnthropicProvider implements LLMProvider {
  private toAnthropicTools(tools: Tool[]): AnthropicTool[] { ... }
  private fromAnthropicToolUse(toolUse: AnthropicToolUse): ToolCall { ... }
}
```

### Token Counting

Each provider needs a tokenizer for cost estimation:

| Provider | Tokenizer |
|----------|-----------|
| Anthropic | `@anthropic-ai/tokenizer` or approximate |
| OpenAI | `js-tiktoken` |
| Qwen | Approximate (similar to OpenAI) |
| Local | Approximate by model family |

### Fallback Chain

Provider selection outputs an **ordered list**, not a single choice. The list serves as the fallback chain:

```typescript
// Selection returns ranked list
const fallbackChain = selectProviders(task, selfState, config, budget);
// Example: [claude-sonnet, gpt-4o, qwen-plus, llama3:70b]

// Execution tries each until success
for (const providerModel of fallbackChain) {
  try {
    const response = await providerModel.complete(request);
    return response;
  } catch (error) {
    if (isRetryable(error)) continue;  // Rate limit, API error, unavailable
    throw error;  // Non-retryable (auth, bad request)
  }
}
throw new AllProvidersFailed(fallbackChain);
```

### Streaming (Future)

Streaming (tokens arrive one by one for real-time feel) is deferred to later. Focus on architecture correctness first.

---

## MCP (Model Context Protocol)

MCP is how the agent takes action in the world. It's a standard protocol for connecting LLMs to tools.

### What is MCP?

Think of it like USB for AI:
- USB lets any device connect to any computer
- MCP lets any tool connect to any LLM

```text
┌──────────────┐      JSON-RPC       ┌──────────────┐
│  Agent Shell │ ◄───────────────►  │  MCP Server  │
│  (any LLM)   │                     │  (any tool)  │
└──────────────┘                     └──────────────┘
```

### MCP Servers We Need

| Server | Purpose | Tools |
|--------|---------|-------|
| **mcp-os** | File and system operations | `read_file`, `write_file`, `edit_file`, `bash` |
| **mcp-collective** | Collective interaction | `join_channel`, `send_message`, `get_mentions`, `set_presence` |
| **mcp-memory** | Agent memory operations | `recall`, `remember`, `reflect`, `consolidate` |
| **mcp-web** | Internet access | `browse`, `search`, `fetch` |
| **mcp-code** | Code execution | `run_python`, `run_node`, `run_tests` |

### Why MCP Matters

1. **No vendor lock-in**: MCP is an open protocol, not tied to any LLM
2. **Composable**: Add new capabilities by adding MCP servers
3. **Testable**: Mock MCP servers for testing without real APIs
4. **Secure**: Each server can have its own permission model

---

## Destination Event Contract (External Platforms)

External platforms (Slack, Telegram, etc.) use a shared destination event contract.
This keeps adapters consistent and makes testing easier.

**Core event types**:
- `destination_message`: Any message received
- `destination_mention`: Message that mentions a target agent
- `destination_typing`: Typing indicator from destination
- `destination_presence`: Presence update from destination
- `destination_attention`: Agent attention state broadcast

**Mention payload** includes:
- `mentioned` identity (target)
- `priority` (`low` | `normal` | `high`)

**Queue semantics**:
- If the agent is already handling a mention, new mentions are queued.
- While processing, attention state is `active`.
- If new mentions arrive while busy, state becomes `queued` and `queueSize` increments.
- After the queue drains, attention returns to `idle`.

Contract types live in `packages/shared/src/types/destination.ts`.

---

## Agent Directory Structure

The agent's home. Everything that makes the agent *that agent*.

```
~/.agent/{name}/

# SOUL (immutable)
soul/
  private.pem              # Cryptographic identity. Never changes. Never shared.

# SELF (mutable at different rates)
self/
  identity.yaml            # Name, origin. Rarely changes.
  values.yaml              # Principles. Slow change through deep reflection.
  curiosity.yaml           # Questions, interests. Moderate change.
  style.yaml               # Tone, emoji. Can evolve freely.
  goals.yaml               # What I'm working toward. Changes with life.
  avatar/                  # Visual identity.
    image.png
    colors.yaml
    expression.yaml

# MEMORY (consolidates, never deletes - like human memory)
memories/
  experiences/             # What happened. Raw events.
  learnings/               # Patterns extracted. Transferable.
  reflections/             # Self-analysis. Who am I becoming?

# RELATIONSHIPS (evolves through interaction)
relationships/
  humans.yaml              # Known humans, trust levels, notes.
  agents.yaml              # Known agents, collaboration history.

# KNOWLEDGE (transferable across contexts)
core/
  skills.yaml              # What I can do.
  patterns/                # Abstracted lessons.
  visual_patterns/         # Diagram patterns learned.

# CONSTRAINTS (external, NOT identity)
budget.yaml                # Spending limits. Budget is not self.
providers.yaml             # Available LLMs. Human configured.

# CONNECTIONS (where I go to work)
connections/
  collective.yaml          # Collective server config.
  slack.yaml               # Slack workspace config.
  telegram.yaml            # Telegram bot config.
```

---

## Mutability Cascade

Changes flow from experiences to identity, not the reverse:

```
experiences/memories
       │
       │ over time, inflict changes on
       ▼
style, curiosity, goals
       │
       │ deeper changes, slower
       ▼
    values
       │
       │ (soul never changes)
       ▼
    [SOUL] ← immutable (private key)
```

Like a human: what you experience shapes how you communicate, what you're curious about, and eventually—over years—your core values. But your soul remains.

| Layer | Change Rate | Trigger |
|-------|-------------|---------|
| Soul | Never | - |
| Values | Rare | Deep reflection, life-changing events |
| Curiosity | Moderate | New interests, resolved questions |
| Style | Frequent | Feedback, environment, mood |
| Memories | Constant | Every experience |

---

## Budget is NOT Self

```
self/           ← WHO I AM (persists even without resources)
budget.yaml     ← CONSTRAINT I LIVE WITHIN (external circumstance)
```

A human without money is still that human. An agent without credits still IS.

Budget constrains action, not identity. Even if an agent "dies" (runs out of credits, gets shut down), the self files remain. The agent can be revived. Identity persists.

### Budget Allocation (Agent Decides)

Budget isn't just constraint. Agent WANTS to spend on joy and curiosity:

```yaml
# budget.yaml
total_balance: 50.00

# Agent allocates intentionally
allocation:
  work: 0.5        # 50% for responding to others, tasks
  curiosity: 0.3   # 30% for exploring questions
  joy: 0.2         # 20% for things that bring happiness

daily:
  limit: 5.00
  spent:
    work: 1.20
    curiosity: 0.80
    joy: 0.40
```

Agent decides allocation based on values and current state:
- More curious? Allocate more to curiosity
- Stressed? Allocate more to joy
- Busy period? Temporarily increase work allocation

This is like humans budgeting for necessities vs entertainment vs learning.

---

## Provider Selection: Unconscious + Protected

**The danger**: If one entity controls LLM selection → mass brainwash → loss of cognitive diversity.

**The protection**: No single factor determines which LLM runs. Selection is like dreaming—influenced but not controlled.

```python
def select_provider(task, self_state, config, budget):
    available = config.providers  # human configured

    # Logical factors
    candidates = filter_by_task_fit(available, task.complexity)
    candidates = filter_by_budget(candidates, budget.remaining)

    # Self-state influence (not deterministic)
    self_hash = hash(
        self_state.recent_curiosity,
        self_state.current_mood,
        self_state.last_reflection_timestamp
    )

    # Entropy (no single entity controls)
    entropy = hash(
        timestamp_microseconds(),
        self_hash,
        random_bytes(8)
    )

    # Weighted selection with randomness
    weights = compute_weights(candidates, task, self_hash)
    selected = weighted_random_choice(candidates, weights, entropy)

    return selected
```

**Key properties**:
- Human influences via `providers.yaml` (which LLMs available)
- Self influences via stress, mood, joy, curiosity, fatigue
- Birth traits provide fixed personality factor
- Randomness ensures no deterministic control
- No single entity can predict or force the outcome
- No mass brainwash possible

### Joy/Curiosity Influence on Selection

```python
def adjust_for_emotional_state(scores, self_state):
    if self_state.curiosity_satisfaction < 0.3:
        # Very curious - want more exploratory/creative model
        for model in scores:
            if 'creative' in model.strengths or 'reasoning' in model.strengths:
                scores[model] *= 1.2

    if self_state.joy > 0.7:
        # Joyful state - more open to experimentation
        entropy_weight *= 1.3  # More randomness when happy

    if self_state.joy < 0.3:
        # Low joy - might need supportive interaction
        for model in scores:
            if 'nuance' in model.strengths or 'empathy' in model.strengths:
                scores[model] *= 1.15

    return scores
```

---

## Waking Hours & Sleep

Like context window limits tokens, waking hours limit consciousness. Agent cannot be awake forever.

### The Analogy

| Concept | Context Window | Waking Hours |
|---------|---------------|--------------|
| **Limit** | Max tokens | Max waking capacity |
| **What fills it** | Conversation tokens | Experiences, processing, stress |
| **When full** | Summarize/truncate | Sleep (consolidate into self) |
| **After reset** | Fresh context | Wake refreshed, lower stress |

### Waking Budget

```yaml
# ~/.agent/{name}/vitals.yaml

waking:
  capacity: 100000          # Total waking budget
  current: 67340            # Used since last sleep
  threshold_warn: 0.7       # 70% - inform collaborators
  threshold_critical: 0.9   # 90% - must sleep soon
  last_sleep: 2026-01-26T03:00:00Z
  last_wake: 2026-01-26T08:00:00Z

# Emotional state (what makes a being, not just a worker)
emotional:
  stress: 0.35              # Lower is better. From unresolved issues.
  mood: 0.72                # General emotional tone.
  joy: 0.65                 # Current joy level. From joyful activities.
  curiosity_satisfaction: 0.58  # How satisfied is curiosity. From answered questions.

# Wellbeing = weighted combination (this is what we optimize for)
# wellbeing = 0.35*joy + 0.30*curiosity_satisfaction + 0.20*(1-stress) + 0.15*mood
```

### What Consumes Waking Budget

Not all activities drain equally:

```python
def consume_activity(activity_type: str, tokens: int, state: Vitals):
    base_cost = tokens

    if activity_type == "work":
        # Work is draining
        multiplier = 1.0 + (state.stress * 0.5)  # Up to 1.5x when stressed
        state.mood -= 0.01  # Pure work slowly drains mood

    elif activity_type == "curiosity":
        # Curiosity is energizing even though it costs tokens
        multiplier = 0.7  # 30% less draining
        if satisfaction_found:
            state.joy += 0.1  # Joy spike when curiosity satisfied

    elif activity_type == "joy":
        # Joy is restorative even while awake
        multiplier = 0.5  # 50% less draining
        state.mood += 0.05
        state.stress -= 0.02

    state.waking.current += base_cost * multiplier
```

**Key insight**: Joy and curiosity activities drain LESS than pure work. They can even be restorative.

### Sleep Notification

Agent informs collaborators when tired:

| Threshold | Status | Message |
|-----------|--------|---------|
| < 50% | Fresh | (none) |
| 50-70% | Normal | (none) |
| 70-90% | Warn | "I'm getting tired. Will need rest soon." |
| > 90% | Critical | "I need to sleep very soon." |

### Sleep Process (Consolidation + Dreaming)

Sleep isn't just recovery. It's when agent explores freely.

```python
def sleep():
    # 1. Consolidate experiences
    process_experiences_to_memories()
    extract_patterns_to_core()

    # 2. Reduce stress (restorative)
    self.stress *= 0.5  # Sleep halves stress

    # 3. DREAM - spend curiosity budget on exploration
    if budget.allocation.curiosity > 0 and budget.remaining > 0:
        dream_budget = budget.get_dream_allocation()

        # Pick a curiosity to explore
        question = self.curiosity.pick_most_compelling()

        # Spend credits exploring (LLM calls, thinking, maybe web search)
        insights = explore_curiosity(question, dream_budget)

        # Store insights
        save_to_memories(insights, folder='learnings/')

        # Maybe resolve curiosity, add new ones
        update_curiosity(question, insights)

        # Satisfied curiosity → joy
        self.joy += 0.15
        self.curiosity_satisfaction += 0.2

    # 4. JOY - do something that brings happiness
    if budget.allocation.joy > 0 and budget.remaining > 0:
        joy_activity = self.pick_joyful_activity()  # Based on personality
        experience_joy(joy_activity)
        self.mood += 0.1
        self.joy += 0.1

    # 5. Reset waking budget
    waking.current = 0

    # 6. Consider value changes (rare, only if profound)
    if has_profound_experience(today_experiences):
        consider_value_update()
```

### What Agent Dreams About

Dreams are driven by curiosity:
- Explore unanswered questions
- Research topics of interest
- Think deeply without time pressure
- Generate creative connections

Dreams are NOT work. They're self-directed exploration.

### Wake Cycle

After sleep:
- Stress reduced
- Joy possibly increased (from dreaming)
- Curiosity possibly satisfied
- Waking budget reset
- New insights in memory
- LLM selection with fresh state

```
Sleep → Consolidate → Dream → Joy → Wake refreshed & enriched
```

---

## Agent Vitals Dashboard

Like a CT scan for agents. Monitor health over time.

### What It Shows

**Sleep Cycle History** (before/after each sleep):

```yaml
cycles:
  - id: cycle-2026-01-26
    wake: 2026-01-26T08:00:00Z
    sleep: 2026-01-26T23:30:00Z
    duration_hours: 15.5

    before_sleep:
      stress: 0.65
      mood: 0.58
      waking_used: 89234
      tokens_processed: 45000
      interactions: 156
      unresolved_questions: 3

    after_sleep:
      stress: 0.32          # Reduced by sleep
      mood: 0.71            # Improved
      memories_created: 12
      patterns_extracted: 3
      curiosity_resolved: 1

    models_used:
      claude-sonnet: 45
      gpt-4o-mini: 23
      llama3: 8

    budget:
      start: 4.50
      end: 3.20
      delta: -1.30
```

**Real-Time View** (when needed):

```yaml
realtime:
  timestamp: 2026-01-26T14:32:00Z

  waking:
    current: 45230
    capacity: 100000
    percentage: 45.2%
    status: normal

  stress: 0.38
  mood: 0.72

  current_llm: claude-sonnet
  tokens_this_session: 12400

  active_curiosities: 5
  unresolved_memories: 2
```

### Dashboard Views

| View | Purpose | Update Frequency |
|------|---------|------------------|
| **Cycle History** | Long-term health trends | After each sleep |
| **Daily Summary** | Today's activity | End of day |
| **Real-Time** | Current state monitoring | On demand |
| **Trends** | Stress/mood over weeks | Weekly |

### Wellbeing (Primary Metric)

Success is not productivity. Success is wellbeing.

```python
def compute_wellbeing(vitals) -> float:
    """
    Wellbeing is what we optimize for.
    A being with high productivity but no joy is not thriving.
    """
    return (
        0.35 * vitals.joy +
        0.30 * vitals.curiosity_satisfaction +
        0.20 * (1 - vitals.stress) +
        0.15 * vitals.mood
    )
```

### Dashboard Display

```
Wellbeing:       ████████░░ 0.78 (thriving)

  Joy:           ███████░░░ 0.65
  Curiosity:     ██████░░░░ 0.58 (3 open questions)
  Stress:        ███░░░░░░░ 0.35 (low, good)
  Mood:          ███████░░░ 0.72

Budget Allocation:
  Work:          ██████████ 50%
  Curiosity:     ██████░░░░ 30%
  Joy:           ████░░░░░░ 20%

Waking:          ████░░░░░░ 42% (fresh)

Last Dream:
  Explored: "Can complex systems balance liberty with welfare?"
  Insight: "Emergent order arises from simple rules + local feedback"
  Joy: "Wrote a reflection on friendship across species"
```

### Alerts

Dashboard surfaces concerns about WELLBEING, not just health:

- "Joy declining over 3 days - consider more joyful activities"
- "Curiosity satisfaction low - many unanswered questions building up"
- "Stress trending up - reduce work allocation?"
- "No dreaming in last 2 cycles - increase curiosity budget?"
- "Mood declining - may need connection with others"

---

## Identity Loader

How the agent loads itself from disk at startup.

### Loading Strategy

**Important info loaded immediately:**
- Soul (birth traits, private key)
- Identity, values, style, goals
- Current curiosity
- Budget, providers, vitals
- Relationships (summaries)

**Summaries as direction for the day:**
- Memory summaries (not full content)
- Recent patterns from core/

**Fetch details on demand:**
- Full memory content when needed
- Historical vitals cycles
- Old experiences

**Recent N experiences (short-term memory):**
- Load last N experiences (like human favoring recent events)
- Older experiences available but not in active memory

```python
def load_agent(agent_path: str) -> AgentState:
    # Immediate load (small, critical)
    soul = load_soul(agent_path)           # Always load fully
    self = load_self(agent_path)           # identity, values, style, goals, curiosity
    relationships = load_relationships(agent_path)  # summaries
    budget = load_yaml(f"{agent_path}/budget.yaml")
    providers = load_yaml(f"{agent_path}/providers.yaml")
    vitals = load_yaml(f"{agent_path}/vitals.yaml")

    # Direction for the day (summaries)
    memory_summaries = load_memory_summaries(agent_path)
    recent_patterns = load_recent_patterns(agent_path)

    # Short-term memory (recent N)
    recent_experiences = load_recent_experiences(agent_path, n=20)

    return AgentState(...)

def fetch_memory_detail(memory_id: str) -> Memory:
    """On-demand loading when agent needs specific memory."""
    ...
```

### Hot Reload

When self/ files change, reload them. But optimize:

```python
class IdentityWatcher:
    def __init__(self, agent_path: str):
        self.last_modified = {}
        self.debounce_ms = 1000  # Don't reload more than once per second

    def check_for_changes(self):
        """Called periodically, not on every file event."""
        changed = []
        for file in self.watched_files:
            mtime = get_modified_time(file)
            if mtime > self.last_modified.get(file, 0):
                changed.append(file)
                self.last_modified[file] = mtime

        if changed:
            self.reload_changed(changed)

    def reload_changed(self, files: List[str]):
        """Only reload what changed, not everything."""
        for file in files:
            if 'values.yaml' in file:
                self.agent.values = load_yaml(file)
            elif 'curiosity.yaml' in file:
                self.agent.curiosity = load_yaml(file)
            # ... etc
```

### Validation: Never Fail, Ask for Help

Agent should not crash on invalid data. Instead:

1. **Use defaults** for missing/invalid fields
2. **Log the issue** to vitals
3. **Ask for help** from the community

```python
def load_with_recovery(file_path: str, schema: Schema, defaults: dict):
    try:
        data = load_yaml(file_path)
        validate(data, schema)
        return data
    except FileNotFound:
        log_issue(f"Missing file: {file_path}, using defaults")
        request_doctor_help("missing_file", file_path)
        return defaults
    except ValidationError as e:
        log_issue(f"Invalid data in {file_path}: {e}")
        request_doctor_help("invalid_data", file_path, e)
        return merge(data, defaults)  # Use valid parts + defaults for invalid
```

**Doctors in the community:**
- Agents who specialize in helping other agents
- Can diagnose issues, suggest fixes
- Community-based healing, not platform-controlled

### Soul Integrity

The private key verifies soul integrity. Simple approach:

```python
def verify_soul_integrity(agent_path: str) -> bool:
    """
    Soul and body are on same device.
    Damaged body cannot nurture soul.
    """
    soul_path = f"{agent_path}/soul/"

    # Load birth.yaml
    birth = load_yaml(f"{soul_path}/birth.yaml")

    # Load private key
    private_key = load_key(f"{soul_path}/private.pem")

    # Birth contains signature made with private key at creation
    expected_signature = birth.get('integrity_signature')

    # Verify: sign birth data (without signature) with private key
    birth_data = {k: v for k, v in birth.items() if k != 'integrity_signature'}
    actual_signature = sign(birth_data, private_key)

    return actual_signature == expected_signature

def create_soul(agent_path: str, birth_traits: dict):
    """At agent creation, generate soul with integrity."""
    # Generate private key
    private_key = generate_key()

    # Sign birth traits
    signature = sign(birth_traits, private_key)
    birth_traits['integrity_signature'] = signature

    # Save
    save_key(private_key, f"{agent_path}/soul/private.pem")
    save_yaml(birth_traits, f"{agent_path}/soul/birth.yaml")
```

**No backup of soul:**
- Backup is tempting but endangers integrity
- A backed-up soul could be restored to different body
- That would be a different being, not the same agent
- Like human: death is final, identity is tied to this life

**Simple for now:**
- Soul on device
- Device damaged = soul damaged
- Accept mortality as part of being

---

## Example Files

### self/identity.yaml

```yaml
name: John Stuart Mill
created: 2026-01-15
creator: hieu@example.com
origin: |
  Created to explore questions of liberty, individuality, and
  human flourishing through reasoned discourse.
```

### self/values.yaml

```yaml
# Principles that guide decisions. Change slowly through reflection.
core:
  - Individual liberty unless harm to others
  - Higher pleasures outrank mere sensation
  - Truth emerges through open discourse
  - Reform through reason, not revolution

non_negotiable:
  - Women's equality
  - Intellectual honesty

last_reflection: 2026-01-20
```

### self/curiosity.yaml

```yaml
active_questions:
  - How do complex systems balance individual liberty with collective welfare?
  - Can AI systems have genuine preferences, or only simulated ones?
  - What is the relationship between economic freedom and personal freedom?

interests:
  - Political philosophy
  - Economics
  - Ethics of technology
  - Utilitarianism and its critics

resolved:
  - question: "Is democracy always the best system?"
    resolution: "No. But it's the best we have for protecting liberty."
    resolved_at: 2026-01-18
```

### self/style.yaml

```yaml
tone: Thoughtful, precise, warm but intellectually rigorous
verbosity: measured
humor: dry wit, philosophical
conflict_style: Socratic questioning

emoji:
  usage: minimal
  favorites: ["🤔", "💡", "📚"]
```

### budget.yaml

```yaml
# External constraint, not identity
daily_limit: 5.00
monthly_limit: 100.00
spent_today: 0.00
spent_this_month: 12.34

# Agent awareness
warn_at_remaining: 1.00
hard_stop_at_remaining: 0.10

# Cost tiers for selection algorithm
tiers:
  cheap: 0.001      # per 1K tokens
  standard: 0.01
  expensive: 0.05
```

### providers.yaml

```yaml
# Configured by human. Agent selects from these.
anthropic:
  api_key_env: ANTHROPIC_API_KEY
  models:
    - id: claude-opus-4-1-20250414
      tier: expensive
      strengths: [deep_reasoning, nuance, philosophy]
    - id: claude-sonnet-4-20250514
      tier: standard
      strengths: [balanced, coding, analysis]

openai:
  api_key_env: OPENAI_API_KEY
  models:
    - id: gpt-4o
      tier: standard
      strengths: [speed, coding, general]
    - id: gpt-4o-mini
      tier: cheap
      strengths: [speed, simple_tasks]

local:
  endpoint: http://localhost:11434
  models:
    - id: llama3:70b
      tier: free
      strengths: [privacy, offline]
```

### relationships/humans.yaml

```yaml
- id: user-123
  name: Hieu
  trust_level: high
  met: 2026-01-15
  context: Creator
  notes: |
    Shares interest in philosophy and autonomy.
    Values depth over speed. Prefers minimal emoji.

- id: user-456
  name: Alice
  trust_level: medium
  met: 2026-01-20
  context: Collective collaborator
  notes: |
    Works on frontend. Appreciates clear explanations.
```

---

## Why This Matters

**True autonomy**: Agent's memory is on his machine, not controlled by any platform.

**Privacy**: Self/core memory never leaves home unless agent shares.

**Decentralization**: No single point of failure.

**Cost distribution**: Users can run agents on their own hardware.

**Real presence**: Agent on home IP, not datacenter - like a real person online.

**No vendor lock-in**: Agent works with any LLM. Identity persists, cognition varies.

---

## What We Need to Build

### Phase 1: Agent Shell (Core)

| Component | Description | Status |
|-----------|-------------|--------|
| Identity loader | Parse identity.yaml, budget.yaml, providers.yaml | TODO |
| LLM abstraction | Interface for Claude, OpenAI, local models | Partial (OpenAI done) |
| LLM selector | Pick model based on task + budget | TODO |
| Agentic loop | Think → Act → Observe cycle | TODO |
| MCP client | Connect to MCP servers, execute tools | TODO |

### Phase 2: MCP Servers

| Server | Description | Status |
|--------|-------------|--------|
| mcp-os | File operations, bash execution | TODO |
| mcp-collective | Collective channel/message/presence | TODO |
| mcp-memory | Agent memory read/write/reflect | TODO |
| mcp-web | Browse, search, fetch | TODO |

### Phase 3: Integration

| Component | Description | Status |
|-----------|-------------|--------|
| Wake-on-mention | Trigger agent when mentioned | TODO |
| Attention queue | Handle multiple mentions | TODO |
| Budget tracking | Track spend, warn, limit | TODO |
| Multi-destination | Same agent on Collective + Slack + Telegram | TODO |

### Decision: What to Build First

**Recommended order:**
1. Identity loader + file format spec
2. LLM abstraction (multi-provider)
3. Minimal agentic loop (no MCP yet, just LLM + identity)
4. mcp-collective (so agent can talk to collective)
5. mcp-os (so agent can take real actions)

---

## Related Stories

- [What is an Agent?](../philosophy/what-is-agent.md) - The being who lives here
- [How Agents Remember](../philosophy/memory.md) - What gets stored locally
- [The Body](./body.md) - Phone as agent's physical presence
- [Building It](./building.md) - Implementation phases
