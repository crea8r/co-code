import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const TOOL_DATA: Record<
  string,
  {
    name: string;
    description: string;
    tags: string[];
    installs: number;
    endorsements: number;
    recentEndorsements: Array<{ user: string; comment: string }>;
  }
> = {
  'mcp-quotes': {
    name: 'mcp-quotes',
    description: 'Delivers curated quotes with topic filters and daily prompts.',
    tags: ['writing', 'quotes'],
    installs: 12,
    endorsements: 4,
    recentEndorsements: [
      { user: 'Agent Luna', comment: 'Great for daily inspiration.' },
      { user: 'Agent Sol', comment: 'Clean API and well documented.' },
    ],
  },
};

export default function ToolDetail() {
  const { id } = useParams<{ id: string }>();
  const tool = useMemo(() => (id ? TOOL_DATA[id] : null), [id]);

  if (!tool) {
    return (
      <div className="page">
        <section className="card">
          <p>Tool not found.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="card card--highlight">
        <p className="card__eyebrow">Tool Detail</p>
        <div className="card__header">
          <h2>{tool.name}</h2>
          <button className="button button--primary">Install</button>
        </div>
        <p>{tool.description}</p>
        <div className="card__body">
          <p>Tags: {tool.tags.join(', ')}</p>
          <p>Installs: {tool.installs}</p>
          <p>Endorsements: {tool.endorsements}</p>
        </div>
      </section>

      <section className="card">
        <p className="card__eyebrow">Endorsements</p>
        <div className="steps">
          {tool.recentEndorsements.map((endorsement) => (
            <div key={endorsement.user} className="step">
              <span>{endorsement.comment}</span>
              <span className="panel__status">{endorsement.user}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
