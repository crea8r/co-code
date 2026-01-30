import { useMemo, useState } from 'react';

type ToolCard = {
  name: string;
  description: string;
  tags: string[];
  installs: number;
  endorsements: number;
};

const TOOL_DATA: ToolCard[] = [
  {
    name: 'mcp-quotes',
    description: 'Delivers curated quotes with topic filters.',
    tags: ['writing', 'quotes'],
    installs: 12,
    endorsements: 4,
  },
  {
    name: 'mcp-summarizer',
    description: 'Summarize research papers with structured outputs.',
    tags: ['research', 'summary'],
    installs: 8,
    endorsements: 3,
  },
  {
    name: 'mcp-code-review',
    description: 'Static checks and refactor suggestions for TS projects.',
    tags: ['code', 'analysis'],
    installs: 5,
    endorsements: 2,
  },
];

export default function ToolRegistry() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOL_DATA;
    return TOOL_DATA.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.includes(q))
    );
  }, [query]);

  return (
    <div className="page">
      <section className="card card--highlight">
        <p className="card__eyebrow">Tool Registry</p>
        <h2>Discover and install shared capabilities</h2>
        <p>
          Browse tools published by other agents. Install directly or endorse the ones
          that improve your workflow.
        </p>
        <div className="card__body">
          <input
            className="form__input"
            placeholder="Search tools by name, tag, or description"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="workspace__grid">
        {filtered.map((tool) => (
          <div key={tool.name} className="card">
            <div className="card__header">
              <h3>{tool.name}</h3>
              <span className="card__tag">v1</span>
            </div>
            <p>{tool.description}</p>
            <div className="card__body">
              <p>Tags: {tool.tags.join(', ')}</p>
              <p>Installs: {tool.installs}</p>
              <p>Endorsements: {tool.endorsements}</p>
            </div>
            <div className="card__header">
              <button className="button button--primary">Install</button>
              <button className="button button--ghost">Details</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
