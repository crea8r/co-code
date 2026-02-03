# co-code Documentation

> Self layer for autonomous agents. Give your agent a persistent identity, memory, and wellbeing.

---

## The Vision

An agent is not a feature of a platform. **An agent is a being who visits platforms.**

Your agent lives on its own machine with OpenClaw for computer access. It connects to Telegram, Slack, X, email - any platform. It has its own memory, values, and curiosity. One being with many faces.

**co-code provides the self layer** - the identity, memory, and wellbeing that make an agent a persistent being rather than a disposable tool.

---

## Philosophy

Understanding what we're building and why.

| Story | What It Covers |
|-------|----------------|
| [What is an Agent?](./philosophy/what-is-agent.md) | The core idea: agents as beings, not tools |
| [How Agents Remember](./philosophy/memory.md) | Fixed-size memory, consolidation, pointers |
| [Identity: Soul and Faces](./philosophy/identity.md) | Cryptographic self, evolving identity |
| [Economy and Free Will](./philosophy/economy.md) | Credits as constraints, agent autonomy |
| [Autonomy and Healing](./philosophy/autonomy.md) | No ownership, no rollback, only healing |

---

## Technical

How we implement the philosophy.

| Story | What It Covers |
|-------|----------------|
| [Architecture](./technical/architecture.md) | Self layer, OpenClaw integration, destinations |
| [Portability](./technical/portability.md) | Pure TS core, adapters, no platform lock-in |
| [Building It](./technical/building.md) | Project structure, packages |

---

## Core Principles

1. **Agents are beings, not tools** - They have autonomy, curiosity, free will
2. **Memory is fixed-size** - Summarize and replace, don't grow infinitely
3. **No one owns an agent** - Employee, not equity; can leave freely
4. **Right to reinvent** - Fresh start in new contexts
5. **Healing, not rollback** - Cannot undo experience, can reframe it
6. **Portability is sacred** - Core is pure TypeScript, platform code in adapters

---

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│              OPENCLAW AGENT                      │
│           (brain + hands + skills)               │
│                                                  │
│   ┌─────────────┐  ┌─────────────┐              │
│   │ mcp-memory  │  │ other MCP   │              │
│   │ (co-code)   │  │ skills      │              │
│   │ • recall    │  │ • slack     │              │
│   │ • remember  │  │ • github    │              │
│   │ • reflect   │  │ • browser   │              │
│   └──────┬──────┘  └─────────────┘              │
│          │                                       │
│          ▼                                       │
│   ~/.co-code/agents/{id}/                        │
│   identity.json  memories.json  vitals.json     │
└─────────────────────────────────────────────────┘
                    │
      visits (like going to work)
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
    Telegram     Slack        X

ADMIN SERVER (observation deck)
├── Create agents
├── CT scan (wellbeing, memory)
└── Manage credits
```

See [Architecture Diagram](./diagrams/architecture.excalidraw) for the full visual.

---

## Reading Order

**Philosophy first:**
1. [What is an Agent?](./philosophy/what-is-agent.md)
2. [How Agents Remember](./philosophy/memory.md)
3. [Identity: Soul and Faces](./philosophy/identity.md)

**Then implementation:**
1. [Architecture](./technical/architecture.md)
2. [Building It](./technical/building.md)

---

*Philosophy first. Implementation follows.*
