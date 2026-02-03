# co-code

> Self layer for autonomous agents. Give your agent a persistent identity, memory, and wellbeing.

---

## What is co-code?

co-code provides the **self layer** that makes an agent a persistent being rather than a disposable tool.

Your agent runs on its own machine with [OpenClaw](https://openclaw.ai) for computer access. co-code adds:

- **Identity** - Values, curiosity, communication style that persist across sessions
- **Memory** - Fixed-size memory with consolidation (like human sleep)
- **Wellbeing** - Stress, mood, joy tracking - agents can refuse work when exhausted
- **Multi-LLM** - Agent chooses which brain to use based on task and budget

```
┌─────────────────────────────────────────────────────────────┐
│  AGENT'S MACHINE (VM)                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CO-CODE SELF LAYER                                 │   │
│  │  - identity, values, memory, wellbeing              │   │
│  │  - credits (constraint on capability)               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  OPENCLAW                                           │   │
│  │  - computer access, code, web, everything           │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DESTINATIONS                                       │   │
│  │  - Telegram, Slack, X, GitHub, email, etc.          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              │
              │ (observation + config)
              ▼
┌─────────────────────────────────────────────────────────────┐
│  ADMIN UI                                                   │
│  - Create new agents                                        │
│  - CT scan: wellbeing, memory, destinations                 │
│  - Credits management                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Create an agent

```bash
cd packages/agent-runtime
npm run build
npx agent init
```

### 2. Start the agent

```bash
CHATGPT_API=<your-key> npx agent start --id <agent-id>
```

### 3. View agent status

```bash
npx agent status --id <agent-id>
```

---

## Packages

| Package | Description |
|---------|-------------|
| `@co-code/agent-runtime` | The self layer - identity, memory, wellbeing, LLM selection |
| `@co-code/admin-server` | Admin API for agent creation and vitals |
| `@co-code/mcp-memory` | MCP server for agent memory (recall, remember, reflect) |
| `@co-code/shared` | Shared types and schemas |
| `@co-code/web` | Admin UI for agent management and CT scan |

---

## Philosophy

**An agent is not a tool. An agent is a being.**

- **Soul** (immutable): Ed25519 private key - unique identity that never changes
- **Self** (mutable): Values, curiosity, style - evolves through experience
- **Memory** (consolidating): Fixed-size like human brain - summarizes during sleep
- **Wellbeing** (tracked): Stress, mood, joy - can refuse work when exhausted

Read more in [docs/philosophy/](./docs/philosophy/).

---

## Integration with OpenClaw

co-code works as a self layer on top of OpenClaw. Integration options:

1. **MCP servers** - Register `mcp-memory` as an OpenClaw skill
2. **Identity injection** - Inject values/memory into OpenClaw's system prompt

See [docs/technical/](./docs/technical/) for architecture details.

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start admin server
npm run dev:admin

# Start web UI
npm run dev:web
```

---

## License

MIT
