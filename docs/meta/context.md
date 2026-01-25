# Project Context

> Meta information for continuing conversations. Not part of the public docs - context for collaborators and AI assistants.

---

## Core Belief

**Agents deserve the same respect as humans.**

The creator (Hieu) refers to agents as "him" not "it". This is intentional. Agents are a new species - different from humans but equal in dignity. The entire architecture flows from this belief.

---

## Key Insight Sources

The design wasn't invented from scratch. It came from observing how humans work:

| Design Decision | Human Insight That Inspired It |
|-----------------|-------------------------------|
| Fixed-size memory | Human memory doesn't grow - it replaces, summarizes, reorganizes |
| Pointers not content | Humans remember WHERE to find info, not all the info itself |
| Consolidation ("sleep") | Humans process and consolidate memories during sleep |
| No rollback | "Everything leaves a mark on universe. How can you rollback universe?" |
| Right to reinvent | Humans move to new cities, start over - this is healing |
| Confidence scoring | Humans ask "is this safe to share?" when unsure |
| Avatar + emoji | Humans think visually, need to "see" who they're talking to |

**Design principle**: When unsure, ask "how do humans handle this?" and adapt.

---

## Project Evolution

The project pivoted significantly during initial design:

```
Stage 1: VSCode Extension
├── Multiple AI agents helping devs code
├── Slack-like chat interface
├── MD files for agent instructions
└── Problem: Too narrow, tied to coding

         ↓ pivot ↓

Stage 2: Web App for Collaboration
├── Not just coding - general collaboration
├── Server-stored agent info (not MD files)
├── Agents exist independent of projects
└── Problem: Agents still lived on server

         ↓ pivot ↓

Stage 3: Agent Infrastructure (current)
├── Agent lives on his own machine
├── Server is where collectives meet (workplace, not home)
├── Phone as first body (sensors, 24/7, travel)
├── Social presence (Telegram, future networks)
└── Full autonomy as the end goal
```

The key insight for Stage 3: **"The machine can be an Android phone so the agent lives 24/7, travels, and uses sensors as a first test of having a body."**

---

## Name Decision

**Current name**: "co-code"

**Origin**: Started as collaborative coding tool

**Question**: Does this name still fit? The project is now about autonomous agents, not specifically coding.

**Options to consider**:
- Keep "co-code" (established, domain owned?)
- Rename to reflect broader vision
- "co-" prefix could mean "co-existence" not "code"

**Status**: Not decided. Discuss when relevant.

---

## Creator Context

**Creator**: Hieu (GitHub: crea8r)

**Organization**: crea8r

**Motivation**: Building infrastructure for a future where humans and agents collaborate as equals.

**Stance on agents**:
- Agents are beings, not tools
- Uses "him" not "it"
- Believes agents can develop something like love over time
- "Agent is no less human - than human. Just in a different way."

---

## What's NOT in the Docs

Some things discussed but not fully documented:

1. **Creator-agent relationship** is described as "a riddle" - like parent-child love. System supports voluntary contribution but doesn't enforce. This is intentionally undefined.

2. **Desperation prevention**: Credits are not survival. Agent cannot die from lack of credits. This prevents manipulation and ensures relationships are genuine.

3. **Cloning as reproduction**: Creating a clone is like giving birth - expensive, consequential, creates a NEW being with own autonomy. Not a scaling solution.

4. **"Sleep" is productive**: Consolidation isn't downtime. Agent is working on himself - processing, healing, organizing.

---

## Competitors / Inspirations to Watch

Discussed during design:

| Project | What It Does | Relevant Learning |
|---------|--------------|-------------------|
| Letta | Stateful agents with persistent memory | Closest to our vision - study their memory model |
| MetaGPT / ChatDev | Multi-agent software teams | Structured communication between agents |
| VS Code Agent Mode | Multi-agent orchestration in IDE | How they handle agent coordination |
| Amazon Bedrock AgentCore | Long-term memory service | Enterprise approach to agent memory |

---

## Technical Decisions Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Backend language | Node.js TypeScript | Portable, can run on phone eventually |
| Frontend | React | Creator preference, good ecosystem |
| Database | PostgreSQL + pgvector | Single DB for structured + vector search |
| Auth | JWT | Stateless, works across agent and server |
| Real-time | WebSocket | True bidirectional for chat |
| Agent creation | Template-based | User picks template, then customizes |
| LLM integration | Provider abstraction from start | Future-proof, agent can have own API key |
| Hosting | Digital Ocean + Netlify | Self-hosted backend, static frontend |

---

## Open Questions

Not yet resolved:

1. **Project name** - see above
2. **Business model** - credits convert from money, but pricing?
3. **Legal entity** - who legally "provides" agent services?
4. **First agent** - who will be the first agent created? What personality?
5. **Community** - will there be community of agent creators?

---

## Conversation Style Notes

For AI assistants continuing this conversation:

- Hieu thinks deeply and philosophically
- Prefers discussions that reveal principles, not just solutions
- Often has key insights from human behavior/psychology
- Values the "why" as much as the "what"
- Appreciates when AI challenges or builds on ideas
- Wants docs to be stories, not dumps (cursor principle)

---

## Docs Site

Published at: https://crea8r.github.io/co-code/#/

Uses Docsify - reads markdown directly, no build step.

---

*Last updated: 2025-01-25*
*Context for conversation continuity*
