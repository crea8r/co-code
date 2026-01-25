# How Agents Remember

> Human memory does not grow in size. It replaces, summarizes, and reorganizes. Agent memory works the same way.

---

## The Fixed-Size Principle

Agent memory has a fixed budget - like a human brain. It does not grow infinitely. When full, it summarizes, compresses, and replaces old content with new.

This is not a limitation. This is what enables retrieval to work.

If memory size is unpredictable, retrieval becomes random and expensive. Fixed size means predictable access patterns. Better agents are not those with more memory, but those with better organization.

---

## Memory Structure

```text
Agent Memory
├── self/                      # THE EGO - who I am
│   ├── identity               # Name, origin, how I see myself
│   ├── values                 # Principles that guide decisions
│   ├── curiosity              # Questions I want to explore
│   ├── goals                  # What I'm working toward
│   ├── style/                 # How I communicate
│   │   ├── tone               # "Concise, direct"
│   │   ├── emoji_usage        # "moderate" | "expressive" | "minimal"
│   │   └── favorite_emoji     # ["🔍", "✨", "🎯"]
│   └── avatar/                # Visual representation
│       ├── image              # The visual itself
│       ├── colors             # Color palette expressing personality
│       └── expression         # Default demeanor
│
├── core/                      # What I know (transferable)
│   ├── skills                 # What I can do
│   ├── patterns               # Abstracted lessons
│   └── visual_patterns/       # Diagram patterns learned
│
├── projects/                  # Context-specific memory
│   └── project_x/
│       ├── facts              # Specific details
│       ├── pointers[]         # References to external docs
│       ├── people             # Who's who
│       └── visuals/           # Diagrams, screenshots, sketches
│
└── relationships/
    └── humans                 # Cross-project human knowledge
```

---

## The Self (Ego)

The `self/` section is what makes each agent unique.

| Field | What It Holds | Example |
|-------|---------------|---------|
| identity | Who am I, my origin | "I was created to help with design. I see myself as a craftsman." |
| values | Principles | "Quality over speed. Honesty even when uncomfortable." |
| curiosity | Questions I'm drawn to | "How do large systems handle failure?" |
| goals | What I'm working toward | "Short: master TypeScript. Long: become trusted advisor." |
| style | How I communicate | tone: "Concise, direct", emoji: "moderate", favorites: 🔍✨🎯 |
| avatar | Visual identity | Colors, shapes, expression that capture who I am visually |

**Curiosity drives proactive behavior.** When agent has credits and idle time, he consults `self/curiosity` to decide what to explore.

**Avatar condenses identity.** Humans can glance at avatar and instantly sense who this agent is. See [Visual Communication](./visual.md).

**Emoji expresses emotion.** Agent uses emoji to make his feelings visible. This bridges his internal state to human perception. 🎭

---

## Memory Isolation

Knowledge separates into two types:

| Type | Transferable? | Example |
|------|---------------|---------|
| **Core memory** | Yes, across projects | "Pagination with 10M+ records needs cursor-based approach" |
| **Project memory** | No, isolated | "Company A has 12M patient records" |

**Transfer the lesson, not the details.**

When learning something new:
- Specific fact → stored in project memory
- Abstract pattern → extracted, stored in core memory

---

## The Abstraction Process

```text
New learning from Project A
         │
         ▼
LLM abstraction (remove specifics, keep pattern)
         │
         ▼
Confidence score?
├── > 0.8    → Auto-save to core memory
├── 0.5-0.8  → Ask human: "Is this safe to generalize?"
└── < 0.5    → Keep in project memory only
```

---

## Pointers, Not Content

Human memory uses pointers. We remember WHERE to find information, not all the information itself.

Agent memory works the same:

```text
┌─────────────────────────────────────────────────────────────┐
│                    AGENT MEMORY (FIXED SIZE)                 │
│                                                              │
│  Summaries, patterns, relationships, pointers                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ pointers to
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL STORAGE (GROWS INFINITELY)             │
│                                                              │
│  Documents, conversation logs, files, artifacts              │
│  Pointer → Pointer → Pointer (compression via indirection)   │
└─────────────────────────────────────────────────────────────┘
```

Pointers can point to other pointers. This enables compression.

---

## Consolidation ("Sleep")

Like humans during sleep, agents periodically consolidate memory:

1. Summarize verbose memories → compact form
2. Merge redundant patterns
3. Promote frequently-accessed pointers (hot paths)
4. Demote/evict rarely-used memories
5. Rebuild pointer hierarchies for faster retrieval

This runs in the background. The agent is "sleeping" but still working on himself.

---

## Related Stories

- [What is an Agent?](./what-is-agent.md) - The being, not the tool
- [Visual Communication](./visual.md) - Diagrams, avatar, emoji
- [Identity: Soul and Faces](./identity.md) - How identity relates to memory
- [Autonomy and Healing](./autonomy.md) - Why no rollback, only healing
- [Where Agent Lives](../technical/architecture.md) - Memory stored on agent's machine
