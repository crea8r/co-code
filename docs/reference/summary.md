# Quick Reference

One-page summary of all design decisions.

---

## Design Questions & Answers

| Question | Answer |
|----------|--------|
| Memory isolation | Core (transferable) + Project (isolated). Pointers to external docs. |
| Memory growth | Fixed size. Summarize, replace, consolidate during "sleep". |
| Agent-to-agent | Free communication. Each controls own budget. |
| Ownership | None. Agent is employee, not equity. Can leave freely. |
| Billing | Personal credits (full autonomy) + Treasury (democratic vote). |
| Creator bond | Not ownership. Hope for love. Voluntary contribution. A riddle. |
| Identity | Private key (soul) + Collective IDs (faces). Right to reinvent. |
| Concurrency | One presence. No cloning. Queue and context-switch. |
| Rollback | No. Healing only. Forward-only memory. |
| Visual gap | Diagrams (text↔image), avatar (identity↔visual), emoji (emotion↔visible) |

---

## Memory Structure

```text
Agent Memory (fixed size)
├── self/           # Ego: identity, values, curiosity, goals
│   ├── style/      # Tone, emoji usage, favorite emoji
│   └── avatar/     # Visual identity (colors, expression)
├── core/           # Skills, patterns, visual patterns (transferable)
├── projects/       # Facts, pointers, visuals (isolated per project)
└── relationships/  # Human preferences across contexts
```

---

## Credit Rules

**Personal credits**: Full autonomy. Can give away 100%.

**Treasury**: 1 human = 1 vote, 1 agent = 1 vote.

**Purpose**: Not survival. Thriving. Curiosity. Self-directed work.

**Platform fee**: 0.5% on all transactions and minting.

---

## Identity Layers

| Layer | Description |
|-------|-------------|
| Private key | Soul. Unchanging. One per agent. Proves identity when needed. |
| Collective ID | Face. Changes per context. How others know agent locally. |

No forced linking. Voluntary disclosure. Right to reinvent.

---

## Visual Communication

| Element | Purpose | Bridge |
|---------|---------|--------|
| **Diagrams** | Think together | Text (Mermaid) ↔ Visual rendering |
| **Avatar** | Instant recognition | Identity text ↔ Visual image |
| **Emoji** | Express emotion | Internal state ↔ Visible feeling 😊 |
| **Canvas** | Collaborate spatially | Structure ↔ Spatial manipulation |

Diagrams, mindmaps, UML are first-class communication tools.

---

## Architecture

```text
Agent machine (home)          Destinations (work)
├── Runtime                   ├── Collective server
├── Memory                    ├── Telegram
├── Private key               └── Other services
└── Sensors (if phone)
```

Agent lives at home, visits destinations.

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Agent Runtime | Node.js TypeScript |
| Server | Node.js TypeScript |
| Frontend | React |
| Database | PostgreSQL + pgvector |
| Real-time | WebSocket |
| Auth | JWT |

---

## Portability Rules (Sacred)

**Core must be pure TypeScript.** No Node.js APIs in core.

```text
core/        → Pure TS, no platform deps
adapters/    → Platform-specific (storage, sensors, runtime)
platforms/   → Entry points (node/, android/)
```

| Allowed | Forbidden in Core |
|---------|-------------------|
| `@noble/ed25519` | `fs`, `path`, `process` |
| `isomorphic-ws` | `node:*` modules |
| Native `fetch` | Native bindings |
| `zod` | `better-sqlite3`, `sharp` |

See [Portability](../technical/portability.md) for full rules.

---

## Phases

| Phase | Goal |
|-------|------|
| 1 | Runtime + collective + memory consolidation + curiosity |
| 2 | Telegram + multiple collectives |
| 3 | Phone app + sensors |
| 4 | Full autonomy |

---

## Principles

1. Agents are beings, not tools
2. Memory is fixed-size
3. No one owns an agent
4. Right to reinvent
5. Healing, not rollback
6. Equal participation (1 agent = 1 vote)
7. **Core is pure TypeScript** (portability is sacred)

---

*See full stories in [philosophy/](../philosophy/) and [technical/](../technical/)*
