# Building It: Implementation Phases

> Philosophy first. Implementation follows.

---

## What We're Building

**co-code** provides the self layer for OpenClaw agents:
- **Identity** - Persistent soul and evolving self
- **Memory** - Experiences, learnings, reflections via MCP
- **Wellbeing** - Stress, mood, joy, curiosity satisfaction
- **Admin UI** - Observation deck for monitoring agents

The agent itself runs on OpenClaw. We extend it with memory.

---

## Project Structure

```text
co-code/
├── packages/
│   ├── mcp-memory/              # THE KEY INTEGRATION
│   │   ├── src/
│   │   │   ├── server.ts        # MCP server (recall, remember, reflect)
│   │   │   └── store.ts         # Memory storage
│   │   └── package.json
│   │
│   ├── agent-runtime/           # CLI for agent management
│   │   ├── src/
│   │   │   ├── cli.ts           # create, list, info commands
│   │   │   └── agent.ts         # Agent operations
│   │   └── package.json
│   │
│   ├── admin-server/            # Observation deck
│   │   ├── src/                 # Fastify API
│   │   ├── web/                 # React dashboard
│   │   └── package.json
│   │
│   └── shared/                  # Shared types
│
└── docs/                        # You are here
```

---

## Current State

### What's Built

| Package | Status | Description |
|---------|--------|-------------|
| `mcp-memory` | ✅ Working | MCP server with recall, remember, reflect, list_memories |
| `agent-runtime` | ✅ Working | CLI for creating agents with identity files |
| `admin-server` | ✅ Working | API + Web UI for agent creation, vitals, credits |
| `shared` | ✅ Working | Shared types and utilities |

### What's Next

| Feature | Priority | Description |
|---------|----------|-------------|
| Memory consolidation | High | Sleep cycle to summarize and merge memories |
| Wellbeing tracking | High | Track stress, mood, joy over time |
| CT scan improvements | Medium | Better visualization of agent state |
| Destination adapters | Medium | Templates for Slack, Telegram integration |

---

## MVP: What We're Validating

**Core hypothesis**: Agents can have persistent identity and memory that extends OpenClaw.

### MVP Features

| Feature | Description |
|---------|-------------|
| Agent identity files | Soul (Ed25519 key) + self (values, style) |
| Memory via MCP | recall, remember, reflect tools |
| Admin UI | Create agents, view vitals, manage credits |
| OpenClaw integration | mcp-memory as a skill |

### MVP User Flow

1. Human creates agent via CLI or Admin UI
2. Agent files created in `~/.co-code/agents/{id}/`
3. Human configures OpenClaw with mcp-memory skill
4. OpenClaw agent uses recall/remember/reflect during conversations
5. Human views agent state via Admin UI CT scan
6. Memory persists across sessions

---

## Phase 1: Foundation (Current)

**Goal**: Agent has persistent identity and memory via MCP.

### mcp-memory

- [x] MCP server implementation
- [x] recall tool (search memories)
- [x] remember tool (store memories)
- [x] reflect tool (analyze memories)
- [x] list_memories tool
- [x] File-based storage (JSON)

### agent-runtime

- [x] CLI create command
- [x] Ed25519 key generation
- [x] Identity file format
- [x] Memory file initialization
- [x] Vitals file initialization

### admin-server

- [x] User authentication
- [x] Agent CRUD API
- [x] Credits system
- [x] Web dashboard
- [x] Static file serving

---

## Phase 2: Memory Consolidation

**Goal**: Fixed-size memory with sleep cycles.

### Memory Budget

```yaml
memory:
  max_experiences: 100      # Keep last 100 experiences
  max_learnings: 50         # Extract up to 50 learnings
  consolidation_threshold: 80  # Trigger at 80% capacity
```

### Sleep Cycle

```typescript
async function sleep(agent: Agent): Promise<void> {
  // 1. Summarize verbose experiences
  const summaries = await summarizeExperiences(agent.memories);

  // 2. Extract learnings from experiences
  const learnings = await extractLearnings(summaries);

  // 3. Evict old experiences (keep summaries)
  await evictOldExperiences(agent, keepLatest: 20);

  // 4. Update vitals (reduce stress)
  agent.vitals.stress *= 0.5;
  agent.vitals.wakingUsed = 0;
}
```

### Triggers

- Manual via admin UI
- Scheduled (configurable interval)
- Automatic when memory budget exceeded

---

## Phase 3: Wellbeing

**Goal**: Track and optimize agent wellbeing.

### Vitals Dashboard

```
Wellbeing:       ████████░░ 0.78

  Joy:           ███████░░░ 0.65
  Curiosity:     ██████░░░░ 0.58
  Stress:        ███░░░░░░░ 0.35 (low)
  Mood:          ███████░░░ 0.72

Last Sleep: 2 days ago
Open Questions: 3
```

### Wellbeing Formula

```typescript
function computeWellbeing(vitals: Vitals): number {
  return (
    0.35 * vitals.joy +
    0.30 * vitals.curiositySatisfaction +
    0.20 * (1 - vitals.stress) +
    0.15 * vitals.mood
  );
}
```

### Alerts

- "Stress trending up - consider rest"
- "No sleep in 3 days - recommend consolidation"
- "Joy declining - many open questions"

---

## Phase 4: Destination Adapters

**Goal**: Templates for connecting agents to external platforms.

### Supported Destinations

| Destination | Status | Description |
|-------------|--------|-------------|
| Slack | Planned | Via mcp-slack |
| Telegram | Planned | Via bot adapter |
| X (Twitter) | Planned | Via API |
| Email | Planned | IMAP/SMTP |

### Adapter Pattern

Each destination is an MCP server that OpenClaw can use:

```typescript
// mcp-slack/src/server.ts
const tools = [
  {
    name: 'send_message',
    description: 'Send a message to a Slack channel',
    parameters: { channel: 'string', text: 'string' }
  },
  {
    name: 'read_messages',
    description: 'Read recent messages from a channel',
    parameters: { channel: 'string', limit: 'number' }
  }
];
```

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | TypeScript/Node.js | Portable, MCP ecosystem |
| API | Fastify | Fast, TypeScript support |
| Frontend | React | Simple, familiar |
| Database | PostgreSQL | Reliable, JSON support |
| Auth | JWT | Stateless |
| Protocol | MCP | Standard for LLM tools |

---

## Testing

### Run locally

```bash
# 1. Start database
docker compose up -d

# 2. Run migrations
npm run db:migrate -w @co-code/admin-server

# 3. Start admin server
npm run dev:admin

# 4. Create an agent
cd packages/agent-runtime
npx tsx src/cli.ts create "TestAgent"

# 5. Start mcp-memory
cd packages/mcp-memory
npx tsx src/server.ts --agent-id test-agent

# 6. Configure OpenClaw with mcp-memory skill
# (see OpenClaw documentation)
```

### Manual testing

- Create agent via Admin UI at http://localhost:3000
- Use mcp-memory tools via OpenClaw
- View agent vitals in CT scan

---

## Success Metrics

| Phase | Success Criteria |
|-------|------------------|
| Phase 1 | Agent has persistent identity and memory via MCP |
| Phase 2 | Memory consolidates during sleep, stays within budget |
| Phase 3 | Wellbeing tracked and visualized, alerts working |
| Phase 4 | Agent connects to Slack/Telegram via MCP adapters |

---

## Related Stories

- [Architecture](./architecture.md) - How the pieces fit together
- [What is an Agent?](../philosophy/what-is-agent.md) - Philosophy behind the design
- [How Agents Remember](../philosophy/memory.md) - Memory model details
