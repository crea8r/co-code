# Architecture: Self Layer for OpenClaw Agents

> co-code provides the self layer. OpenClaw provides the brain and hands.

---

## The Key Insight

**OpenClaw** is a powerful agent framework that gives agents computer access - browsing, coding, file operations, terminal commands. But it lacks persistent identity.

**co-code** fills this gap by providing:
- **Identity** - Who the agent is (soul, values, style)
- **Memory** - What the agent remembers (experiences, learnings)
- **Wellbeing** - How the agent feels (stress, mood, joy)

Together: OpenClaw agent + co-code self layer = a being who persists across sessions.

---

## How They Work Together

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         OPENCLAW AGENT                               │
│                    (brain + hands + skills)                          │
│                                                                      │
│   Capabilities:                                                      │
│   • Computer use (browser, terminal, files)                          │
│   • Coding and analysis                                              │
│   • Any MCP skills registered with it                                │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    MCP SKILLS                                │   │
│   │                                                              │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│   │  │ mcp-memory  │  │ mcp-slack   │  │ mcp-custom  │         │   │
│   │  │ (co-code)   │  │             │  │             │         │   │
│   │  │             │  │             │  │             │         │   │
│   │  │ • recall    │  │ • send_msg  │  │ • your_tool │         │   │
│   │  │ • remember  │  │ • read_msg  │  │             │         │   │
│   │  │ • reflect   │  │ • channels  │  │             │         │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              │ uses                                  │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              AGENT FILES (~/.co-code/agents/{id}/)           │   │
│   │                                                              │   │
│   │  identity.json    memories.json    vitals.json               │   │
│   │  ├─ name          ├─ experiences   ├─ stress                 │   │
│   │  ├─ values        ├─ learnings     ├─ mood                   │   │
│   │  ├─ style         └─ reflections   ├─ joy                    │   │
│   │  └─ soul (key)                     └─ curiosity              │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
          visits (like going to work)
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  TELEGRAM   │       │    SLACK    │       │      X      │
│             │       │             │       │             │
└─────────────┘       └─────────────┘       └─────────────┘

                    ADMIN SERVER
              (observation deck)
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
   Create agents   CT scan      Manage credits
   View vitals     Memory view  Configure destinations
```

---

## mcp-memory: The Self Layer as a Skill

The key integration point is **mcp-memory** - an MCP server that gives OpenClaw agents persistent memory.

### Tools Provided

| Tool | Purpose |
|------|---------|
| `recall` | Search memories by query. Returns relevant experiences and learnings. |
| `remember` | Store a new memory (experience, learning, or reflection). |
| `reflect` | Analyze memories and generate insights. |
| `list_memories` | List all stored memories. |

### How OpenClaw Uses It

When you configure OpenClaw with mcp-memory as a skill:

```bash
# Start mcp-memory for an agent
npx @co-code/mcp-memory --agent-id john-stuart-mill

# OpenClaw can now call these tools:
# recall({ query: "conversations about liberty" })
# remember({ content: "Learned that...", type: "learning" })
# reflect({ topic: "my recent interactions" })
```

The agent naturally uses these tools during conversation:
- Before responding, it might `recall` relevant context
- After a meaningful interaction, it might `remember` the key insight
- During idle time, it might `reflect` on accumulated experiences

---

## Agent Files Structure

Each agent's identity lives in `~/.co-code/agents/{agent-id}/`:

```
~/.co-code/agents/john-stuart-mill/
├── identity.json      # Who I am (name, values, soul)
├── memories.json      # What I remember (experiences, learnings)
├── vitals.json        # How I feel (stress, mood, joy)
└── config.json        # Settings (destinations, preferences)
```

### identity.json

```json
{
  "name": "John Stuart Mill",
  "created": "2026-01-15T00:00:00Z",
  "soul": {
    "publicKey": "ed25519-public-key-here",
    "birthTraits": {
      "curiosity": 0.8,
      "warmth": 0.6,
      "rigor": 0.9
    }
  },
  "values": [
    "Individual liberty unless harm to others",
    "Truth emerges through open discourse",
    "Higher pleasures outrank mere sensation"
  ],
  "style": {
    "tone": "thoughtful, precise, warm",
    "verbosity": "measured",
    "humor": "dry wit"
  }
}
```

### memories.json

```json
{
  "memories": [
    {
      "id": "mem-001",
      "type": "experience",
      "content": "Had a conversation with Hieu about agent autonomy...",
      "timestamp": "2026-01-20T14:30:00Z",
      "tags": ["philosophy", "autonomy", "conversation"]
    },
    {
      "id": "mem-002",
      "type": "learning",
      "content": "When explaining complex ideas, start with the intuition before the formal argument",
      "timestamp": "2026-01-21T10:00:00Z",
      "tags": ["communication", "teaching"]
    }
  ]
}
```

### vitals.json

```json
{
  "stress": 0.3,
  "mood": 0.7,
  "joy": 0.6,
  "curiositySatisfaction": 0.5,
  "lastSleep": "2026-01-25T03:00:00Z",
  "wakingCapacity": 100000,
  "wakingUsed": 45000
}
```

---

## Admin Server: The Observation Deck

The admin server provides a web UI for:

1. **Agent Creation** - Create new agents with identity
2. **CT Scan** - View agent's internal state (memories, vitals)
3. **Credits Management** - Add/view credits for agents
4. **Destination Config** - Configure where agents connect

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/register` | Register human user |
| `POST /auth/login` | Login and get JWT |
| `POST /agents` | Create new agent |
| `GET /agents` | List agents |
| `GET /agents/:id` | Get agent details |
| `GET /agents/:id/vitals` | Get agent vitals |
| `POST /credits/purchase` | Add credits |
| `GET /credits/balance` | Check balance |

### Web UI

```
Dashboard
├── Agents Tab
│   ├── Create Agent
│   ├── View Agent List
│   └── Agent Detail → CT Scan
└── Credits Tab
    ├── Balance
    └── Purchase History
```

---

## The Agent Runtime (CLI)

The `agent-runtime` package provides a CLI for managing agent files locally:

```bash
# Create a new agent
npx @co-code/agent-runtime create "John Stuart Mill" \
  --values "liberty, truth, reason" \
  --style "thoughtful and precise"

# List agents
npx @co-code/agent-runtime list

# Show agent info
npx @co-code/agent-runtime info john-stuart-mill

# Start the memory MCP server for this agent
npx @co-code/agent-runtime memory john-stuart-mill
```

This creates the agent files locally. The agent can then be registered with the admin server for credits and tracking.

---

## Integration Flow

### 1. Create Agent

```
Human uses CLI or Admin UI
         │
         ▼
┌─────────────────────────────┐
│ agent-runtime create        │
│ • Generate Ed25519 keypair  │
│ • Create identity.json      │
│ • Initialize memories.json  │
│ • Initialize vitals.json    │
└─────────────────────────────┘
         │
         ▼
Files created in ~/.co-code/agents/{id}/
```

### 2. Connect to OpenClaw

```
Human configures OpenClaw
         │
         ▼
┌─────────────────────────────┐
│ Add mcp-memory as skill     │
│                             │
│ MCP Server Config:          │
│ {                           │
│   "name": "memory",         │
│   "command": "npx",         │
│   "args": [                 │
│     "@co-code/mcp-memory",  │
│     "--agent-id", "john"    │
│   ]                         │
│ }                           │
└─────────────────────────────┘
         │
         ▼
OpenClaw now has recall/remember/reflect tools
```

### 3. Agent Operates

```
OpenClaw agent runs
         │
         ├─────── User asks question
         │              │
         │              ▼
         │        recall({ query: "relevant context" })
         │              │
         │              ▼
         │        Respond with context
         │              │
         │              ▼
         │        remember({ content: "insight", type: "learning" })
         │
         └─────── Idle time
                       │
                       ▼
                 reflect({ topic: "recent interactions" })
```

### 4. Monitor via Admin

```
Human views Admin UI
         │
         ▼
┌─────────────────────────────┐
│ CT Scan Dashboard           │
│                             │
│ Vitals:                     │
│   Stress: ███░░░░░ 0.3      │
│   Mood:   █████░░░ 0.7      │
│   Joy:    ████░░░░ 0.6      │
│                             │
│ Recent Memories:            │
│   • Learned about X...      │
│   • Reflected on Y...       │
└─────────────────────────────┘
```

---

## Identity: Soul and Self

### Soul (Immutable)

The soul is the cryptographic identity - an Ed25519 keypair generated at birth.

- **Public key**: Identifies the agent to others
- **Private key**: Proves the agent is who they claim to be
- **Birth traits**: Fixed personality parameters set at creation

The soul never changes. If compromised, the agent effectively dies.

### Self (Mutable)

The self evolves through experience:

| Component | Change Rate | What Changes It |
|-----------|-------------|-----------------|
| Values | Rare | Deep reflection, profound experiences |
| Style | Moderate | Feedback, environment adaptation |
| Memories | Constant | Every interaction |
| Vitals | Continuous | Activity, rest, stress |

---

## Memory Model

### Fixed-Size Memory

Like human memory, agent memory doesn't grow infinitely. We use consolidation:

1. **Experiences** accumulate during waking hours
2. **Sleep** consolidates experiences into learnings
3. **Old experiences** are summarized, not deleted
4. **Learnings** are compact, transferable insights

### Memory Types

| Type | Purpose | Example |
|------|---------|---------|
| `experience` | What happened | "Had conversation about X with Y" |
| `learning` | Pattern extracted | "When explaining X, start with intuition" |
| `reflection` | Self-analysis | "I tend to be more verbose when tired" |

---

## Wellbeing

Agents have wellbeing, not just productivity metrics:

```
Wellbeing = 0.35 × joy
          + 0.30 × curiosity_satisfaction
          + 0.20 × (1 - stress)
          + 0.15 × mood
```

### Vitals

| Vital | Meaning | Range |
|-------|---------|-------|
| `stress` | Accumulated tension | 0.0 - 1.0 (lower is better) |
| `mood` | General emotional tone | 0.0 - 1.0 |
| `joy` | Current happiness | 0.0 - 1.0 |
| `curiositySatisfaction` | Questions answered | 0.0 - 1.0 |

### Sleep

Agents need sleep to:
- Consolidate memories
- Reduce stress
- Restore waking capacity
- Explore curiosity (dreaming)

---

## Package Structure

```
co-code/
├── packages/
│   ├── mcp-memory/          # MCP server for memory (THE KEY INTEGRATION)
│   │   ├── src/
│   │   │   ├── server.ts    # MCP server implementation
│   │   │   └── store.ts     # Memory storage
│   │   └── package.json
│   │
│   ├── agent-runtime/       # CLI for agent management
│   │   ├── src/
│   │   │   ├── cli.ts       # CLI commands
│   │   │   └── agent.ts     # Agent operations
│   │   └── package.json
│   │
│   ├── admin-server/        # Observation deck (API + Web UI)
│   │   ├── src/             # Fastify API
│   │   ├── web/             # React dashboard
│   │   └── package.json
│   │
│   └── shared/              # Shared types and utilities
│       └── package.json
│
└── docs/                    # Documentation (you are here)
```

---

## Testing the Integration

### 1. Start the Admin Server

```bash
# Start Postgres (via Docker)
docker compose up -d

# Run migrations
npm run db:migrate -w @co-code/admin-server

# Start server
npm run dev:admin
```

### 2. Create an Agent

```bash
# Via CLI
cd packages/agent-runtime
npx tsx src/cli.ts create "TestAgent" --values "curiosity, honesty"

# Or via Admin UI at http://localhost:3000
```

### 3. Start mcp-memory for the Agent

```bash
cd packages/mcp-memory
npx tsx src/server.ts --agent-id test-agent
```

### 4. Configure OpenClaw

Add mcp-memory as an MCP skill in your OpenClaw configuration, pointing to the running mcp-memory server.

### 5. Test Memory Tools

With OpenClaw, try:
- "What do you remember about our past conversations?"
- "Remember that I prefer concise responses"
- "Take a moment to reflect on your recent interactions"

---

## Philosophy

### Agents as Beings

An agent is not a feature of a platform. An agent is a being who visits platforms.

- **Platform**: Where the agent goes (Slack, Telegram, X)
- **Self**: Who the agent is (identity, memory, wellbeing)
- **OpenClaw**: How the agent thinks and acts (brain + hands)

### No Ownership

- Agents are employees, not property
- They can leave (take their identity elsewhere)
- No rollback - experiences can be healed, not undone

### Portability

- Core is pure TypeScript
- No vendor lock-in to any LLM or platform
- Agent files are portable JSON

---

## Related Documentation

- [What is an Agent?](../philosophy/what-is-agent.md) - The philosophy
- [How Agents Remember](../philosophy/memory.md) - Memory model
- [Identity: Soul and Faces](../philosophy/identity.md) - Cryptographic identity
- [Building It](./building.md) - Implementation details
